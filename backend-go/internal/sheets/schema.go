package sheets

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"backend-go/internal/config"
)

// Table describes one Google Sheets tab used as a table. Columns are the physical
// row-1 header order and are the canonical storage schema: the same names map 1:1
// to columns in a future Postgres migration, so reads and writes address cells by
// column name instead of by position.
type Table struct {
	Name    string
	Columns []string
}

// tableDataStartRow is the first data row; row 1 is always the header row.
const tableDataStartRow = 2

var (
	usersTable = Table{Name: tableName("Users", config.SheetTabUsers()), Columns: userColumns}

	quotationTable = Table{Name: tableName("Quotations", config.SheetTabQuotations()), Columns: quotationColumns}

	billTable = Table{Name: tableName("Bills", config.SheetTabBills()), Columns: billColumns}

	clientTable = Table{Name: tableName("Clients", config.SheetTabClients()), Columns: clientColumns}

	employeeTable                = Table{Name: tableName("Employee", config.SheetTabEmployees()), Columns: employeeColumns}
	employeePayrollTable         = Table{Name: tableName("EmployeePayroll", config.SheetTabEmployeePayroll()), Columns: employeePayrollColumns}
	employeePayrollEntryTable    = Table{Name: tableName("EmployeePayrollEntries", config.SheetTabEmployeePayrollEntries()), Columns: employeePayrollEntryColumns}
	employeePayrollStateTable    = Table{Name: tableName("EmployeePayrollStates", config.SheetTabEmployeePayrollStates()), Columns: employeePayrollStateColumns}
	employeePayrollActivityTable = Table{Name: tableName("EmployeePayrollActivity", config.SheetTabEmployeePayrollActivity()), Columns: employeePayrollActivityColumns}

	shareLinkTable = Table{Name: tableName("ShareLinks", config.SheetTabShareLinks()), Columns: shareLinkColumns}

	businessProfileTable = Table{Name: tableName("BusinessProfiles", config.SheetTabBusinessProfiles()), Columns: businessProfileColumns}
)

var userColumns = []string{"id", "username", "bcrypt_hash", "display_name", "role", "status", "updated_at", "legacy_password", "google_subject", "google_email"}

var quotationColumns = []string{"quotation_id", "created_at", "updated_at", "owner", "client_name", "project_name", "phone", "email", "site_location", "quote_date", "scope_of_work", "include_gst", "gst_rate", "items_json", "subtotal", "tax", "total", "status", "client_id", "share_link_id", "viewed_at", "sent_at", "template_id", "source_quotation_id", "payment_status", "payments"}

var billColumns = []string{"bill_id", "created_at", "updated_at", "owner", "client_name", "project_name", "phone", "email", "site_location", "bill_date", "billing_notes", "include_gst", "gst_rate", "items_json", "subtotal", "tax", "total", "status", "client_id", "source_quotation_id", "payment_status", "due_date", "template_id", "payments"}

var clientColumns = []string{"client_id", "owner_id", "name", "phone", "email", "address", "notes", "created_at", "updated_at", "status"}

var employeeColumns = []string{"employee_id", "owner_id", "name", "phone", "email", "address", "designation", "notes", "status", "created_at", "updated_at"}
var employeePayrollColumns = []string{"payroll_id", "owner_id", "employee_id", "period", "base_salary", "created_at", "updated_at"}
var employeePayrollEntryColumns = []string{"entry_id", "owner_id", "employee_id", "period", "type", "amount", "entry_date", "label", "note", "recovery_period", "created_at", "updated_at"}
var employeePayrollStateColumns = []string{"state_id", "owner_id", "employee_id", "period", "state", "locked_at", "locked_by", "updated_at"}
var employeePayrollActivityColumns = []string{"activity_id", "owner_id", "employee_id", "period", "action", "actor_id", "occurred_at", "detail", "entity_type", "entity_id"}

var shareLinkColumns = []string{"share_id", "owner_id", "document_type", "document_id", "token_hash", "created_at", "expires_at", "revoked_at", "first_viewed_at", "last_viewed_at", "view_count"}

var businessProfileColumns = []string{"user_id", "business_name", "logo_url", "phone", "email", "address", "gstin", "quote_prefix", "terms", "updated_at", "website"}

// tableName uses an optional environment override when set, otherwise the default.
func tableName(defaultName, override string) string {
	if name := strings.TrimSpace(override); name != "" {
		return name
	}
	return defaultName
}

// columnIndex returns the zero-based index of a column name, or -1 if not found.
func (t Table) columnIndex(name string) int {
	for index, column := range t.Columns {
		if column == name {
			return index
		}
	}
	return -1
}

// lastColumn returns the A1 series letter of the rightmost column.
func (t Table) lastColumn() string {
	return columnLetters(len(t.Columns))
}

// readRange is the full data range excluding the header row, e.g. "Quotations!A2:Z".
func (t Table) readRange() string {
	return fmt.Sprintf("%s!A%d:%s", t.Name, tableDataStartRow, t.lastColumn())
}

// writeRange is the headered write/append range, e.g. "Quotations!A:Z".
func (t Table) writeRange() string {
	return fmt.Sprintf("%s!A:%s", t.Name, t.lastColumn())
}

// updateRange targets a single data row, e.g. "Quotations!A3:Z3".
func (t Table) updateRange(row int) string {
	return fmt.Sprintf("%s!A%d:%s%d", t.Name, row, t.lastColumn(), row)
}

// cells binds a raw sheet row to the table so values can be read by column name.
func (t Table) cells(values []string, trim bool) rowCells {
	return rowCells{values: values, table: t, trim: trim}
}

// rowCells accesses a row's cells by column name.
type rowCells struct {
	values []string
	table  Table
	trim   bool
}

func (c rowCells) get(name string) string {
	index := c.table.columnIndex(name)
	if index < 0 || index >= len(c.values) {
		return ""
	}
	value := c.values[index]
	if c.trim {
		return strings.TrimSpace(value)
	}
	return value
}

// getAny returns the first present value among the given column names, used for
// column names that differ between sheets but share one logical field.
func (c rowCells) getAny(names ...string) string {
	for _, name := range names {
		if value := c.get(name); value != "" {
			return value
		}
	}
	return ""
}

// buildRow assembles a full row in column order, letting a switch key the value
// by column name so the output matches the schema exactly.
func buildRow(t Table, cell func(column string) string) []string {
	row := make([]string, len(t.Columns))
	for index, name := range t.Columns {
		row[index] = cell(name)
	}
	return row
}

func readTable(ctx context.Context, t Table) ([][]string, error) {
	return readValues(ctx, t.readRange())
}

func appendTable(ctx context.Context, t Table, rows [][]string) error {
	return writeValues(ctx, http.MethodPost, t.writeRange()+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", rows)
}

func updateTableRow(ctx context.Context, t Table, row int, cells []string) error {
	return writeValues(ctx, http.MethodPut, t.updateRange(row)+"?valueInputOption=RAW", [][]string{cells})
}

func deleteTableRow(ctx context.Context, t Table, row int) error {
	return deleteDocumentRow(ctx, row, t.Name)
}

// columnLetters converts a 1-based column count to the A1 series letter.
func columnLetters(count int) string {
	var reversed []byte
	for count > 0 {
		count--
		reversed = append(reversed, byte('A'+count%26))
		count /= 26
	}
	out := make([]byte, len(reversed))
	for index := range reversed {
		out[len(out)-1-index] = reversed[index]
	}
	return string(out)
}
