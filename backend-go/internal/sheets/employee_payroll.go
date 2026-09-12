package sheets

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const employeePayrollRange = "EmployeePayroll!A:G"
const employeePayrollEntryRange = "EmployeePayrollEntries!A:L"

type EmployeePayroll struct {
	ID         string  `json:"id"`
	OwnerID    string  `json:"ownerId"`
	EmployeeID string  `json:"employeeId"`
	Period     string  `json:"period"`
	BaseSalary float64 `json:"baseSalary"`
	CreatedAt  string  `json:"createdAt"`
	UpdatedAt  string  `json:"updatedAt"`
	Row        int     `json:"-"`
}
type EmployeePayrollEntry struct {
	ID             string  `json:"id"`
	OwnerID        string  `json:"ownerId"`
	EmployeeID     string  `json:"employeeId"`
	Period         string  `json:"period"`
	Type           string  `json:"type"`
	Amount         float64 `json:"amount"`
	EntryDate      string  `json:"entryDate"`
	Label          string  `json:"label"`
	Note           string  `json:"note"`
	RecoveryPeriod string  `json:"recoveryPeriod"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
	Row            int     `json:"-"`
}

func ListEmployeePayroll(ctx context.Context, owner, employeeID string) ([]EmployeePayroll, error) {
	values, err := readValues(ctx, "EmployeePayroll!A2:G")
	if err != nil {
		return nil, err
	}
	result := []EmployeePayroll{}
	for i, row := range values {
		p := payrollFromRow(row, i+2)
		if p.ID != "" && p.OwnerID == owner && (employeeID == "" || p.EmployeeID == employeeID) {
			result = append(result, p)
		}
	}
	return result, nil
}
func GetEmployeePayrollRecord(ctx context.Context, owner, employeeID, period string) (EmployeePayroll, error) {
	records, err := ListEmployeePayroll(ctx, owner, employeeID)
	if err != nil {
		return EmployeePayroll{}, err
	}
	for _, p := range records {
		if p.Period == period {
			return p, nil
		}
	}
	return EmployeePayroll{}, nil
}
func SaveEmployeePayroll(ctx context.Context, p EmployeePayroll) error {
	return writeValues(ctx, http.MethodPost, employeePayrollRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{payrollToRow(p)})
}
func UpdateEmployeePayroll(ctx context.Context, p EmployeePayroll) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("EmployeePayroll!A%d:G%d?valueInputOption=RAW", p.Row, p.Row), [][]string{payrollToRow(p)})
}

func ListEmployeePayrollEntries(ctx context.Context, owner, employeeID string) ([]EmployeePayrollEntry, error) {
	values, err := readValues(ctx, "EmployeePayrollEntries!A2:L")
	if err != nil {
		return nil, err
	}
	result := []EmployeePayrollEntry{}
	for i, row := range values {
		e := payrollEntryFromRow(row, i+2)
		if e.ID != "" && e.OwnerID == owner && (employeeID == "" || e.EmployeeID == employeeID) {
			result = append(result, e)
		}
	}
	return result, nil
}
func GetEmployeePayrollEntry(ctx context.Context, owner, employeeID, id string) (EmployeePayrollEntry, error) {
	entries, err := ListEmployeePayrollEntries(ctx, owner, employeeID)
	if err != nil {
		return EmployeePayrollEntry{}, err
	}
	for _, e := range entries {
		if e.ID == id {
			return e, nil
		}
	}
	return EmployeePayrollEntry{}, nil
}
func SaveEmployeePayrollEntry(ctx context.Context, e EmployeePayrollEntry) error {
	return writeValues(ctx, http.MethodPost, employeePayrollEntryRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{payrollEntryToRow(e)})
}
func UpdateEmployeePayrollEntry(ctx context.Context, e EmployeePayrollEntry) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("EmployeePayrollEntries!A%d:L%d?valueInputOption=RAW", e.Row, e.Row), [][]string{payrollEntryToRow(e)})
}
func DeleteEmployeePayrollEntry(ctx context.Context, row int) error {
	return deleteDocumentRow(ctx, row, "EmployeePayrollEntries")
}

func payrollFromRow(r []string, row int) EmployeePayroll {
	g := func(i int) string {
		if i < len(r) {
			return strings.TrimSpace(r[i])
		}
		return ""
	}
	v, _ := strconv.ParseFloat(g(4), 64)
	return EmployeePayroll{ID: g(0), OwnerID: g(1), EmployeeID: g(2), Period: g(3), BaseSalary: v, CreatedAt: g(5), UpdatedAt: g(6), Row: row}
}
func payrollToRow(p EmployeePayroll) []string {
	return []string{p.ID, p.OwnerID, p.EmployeeID, p.Period, strconv.FormatFloat(p.BaseSalary, 'f', 2, 64), p.CreatedAt, p.UpdatedAt}
}
func payrollEntryFromRow(r []string, row int) EmployeePayrollEntry {
	g := func(i int) string {
		if i < len(r) {
			return strings.TrimSpace(r[i])
		}
		return ""
	}
	v, _ := strconv.ParseFloat(g(5), 64)
	return EmployeePayrollEntry{ID: g(0), OwnerID: g(1), EmployeeID: g(2), Period: g(3), Type: g(4), Amount: v, EntryDate: g(6), Label: g(7), Note: g(8), RecoveryPeriod: g(9), CreatedAt: g(10), UpdatedAt: g(11), Row: row}
}
func payrollEntryToRow(e EmployeePayrollEntry) []string {
	return []string{e.ID, e.OwnerID, e.EmployeeID, e.Period, e.Type, strconv.FormatFloat(e.Amount, 'f', 2, 64), e.EntryDate, e.Label, e.Note, e.RecoveryPeriod, e.CreatedAt, e.UpdatedAt}
}
func NewPayrollID(prefix string) string { return fmt.Sprintf("%s%d", prefix, time.Now().UnixNano()) }
