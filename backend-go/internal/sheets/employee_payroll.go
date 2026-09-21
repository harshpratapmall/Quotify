package sheets

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
)

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

type EmployeePayrollState struct {
	ID         string `json:"id"`
	OwnerID    string `json:"ownerId"`
	EmployeeID string `json:"employeeId"`
	Period     string `json:"period"`
	State      string `json:"state"`
	LockedAt   string `json:"lockedAt"`
	LockedBy   string `json:"lockedBy"`
	UpdatedAt  string `json:"updatedAt"`
	Row        int    `json:"-"`
}
type EmployeePayrollActivity struct {
	ID         string `json:"id"`
	OwnerID    string `json:"ownerId"`
	EmployeeID string `json:"employeeId"`
	Period     string `json:"period"`
	Action     string `json:"action"`
	ActorID    string `json:"actorId"`
	OccurredAt string `json:"occurredAt"`
	Detail     string `json:"detail"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
}

func ListEmployeePayroll(ctx context.Context, owner, employeeID string) ([]EmployeePayroll, error) {
	values, err := readTable(ctx, employeePayrollTable)
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
	return appendTable(ctx, employeePayrollTable, [][]string{payrollToRow(p)})
}
func UpdateEmployeePayroll(ctx context.Context, p EmployeePayroll) error {
	return updateTableRow(ctx, employeePayrollTable, p.Row, payrollToRow(p))
}

func ListEmployeePayrollEntries(ctx context.Context, owner, employeeID string) ([]EmployeePayrollEntry, error) {
	values, err := readTable(ctx, employeePayrollEntryTable)
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
	return appendTable(ctx, employeePayrollEntryTable, [][]string{payrollEntryToRow(e)})
}
func UpdateEmployeePayrollEntry(ctx context.Context, e EmployeePayrollEntry) error {
	return updateTableRow(ctx, employeePayrollEntryTable, e.Row, payrollEntryToRow(e))
}
func DeleteEmployeePayrollEntry(ctx context.Context, row int) error {
	return deleteTableRow(ctx, employeePayrollEntryTable, row)
}

func ListEmployeePayrollStates(ctx context.Context, owner, employeeID string) ([]EmployeePayrollState, error) {
	rows, err := readTable(ctx, employeePayrollStateTable)
	if err != nil {
		return nil, err
	}
	out := []EmployeePayrollState{}
	for i, r := range rows {
		c := employeePayrollStateTable.cells(r, true)
		s := EmployeePayrollState{ID: c.get("state_id"), OwnerID: c.get("owner_id"), EmployeeID: c.get("employee_id"), Period: c.get("period"), State: c.get("state"), LockedAt: c.get("locked_at"), LockedBy: c.get("locked_by"), UpdatedAt: c.get("updated_at"), Row: i + 2}
		if s.ID != "" && s.OwnerID == owner && (employeeID == "" || s.EmployeeID == employeeID) {
			out = append(out, s)
		}
	}
	return out, nil
}
func GetEmployeePayrollState(ctx context.Context, owner, employeeID, period string) (EmployeePayrollState, error) {
	states, err := ListEmployeePayrollStates(ctx, owner, employeeID)
	if err != nil {
		return EmployeePayrollState{}, err
	}
	for _, s := range states {
		if s.Period == period {
			return s, nil
		}
	}
	return EmployeePayrollState{}, nil
}
func SaveEmployeePayrollState(ctx context.Context, s EmployeePayrollState) error {
	row := buildRow(employeePayrollStateTable, func(k string) string {
		switch k {
		case "state_id":
			return s.ID
		case "owner_id":
			return s.OwnerID
		case "employee_id":
			return s.EmployeeID
		case "period":
			return s.Period
		case "state":
			return s.State
		case "locked_at":
			return s.LockedAt
		case "locked_by":
			return s.LockedBy
		case "updated_at":
			return s.UpdatedAt
		}
		return ""
	})
	if s.Row > 0 {
		return updateTableRow(ctx, employeePayrollStateTable, s.Row, row)
	}
	return appendTable(ctx, employeePayrollStateTable, [][]string{row})
}
func ListEmployeePayrollActivity(ctx context.Context, owner, employeeID string) ([]EmployeePayrollActivity, error) {
	rows, err := readTable(ctx, employeePayrollActivityTable)
	if err != nil {
		return nil, err
	}
	out := []EmployeePayrollActivity{}
	for _, r := range rows {
		c := employeePayrollActivityTable.cells(r, true)
		a := EmployeePayrollActivity{ID: c.get("activity_id"), OwnerID: c.get("owner_id"), EmployeeID: c.get("employee_id"), Period: c.get("period"), Action: c.get("action"), ActorID: c.get("actor_id"), OccurredAt: c.get("occurred_at"), Detail: c.get("detail"), EntityType: c.get("entity_type"), EntityID: c.get("entity_id")}
		if a.ID != "" && a.OwnerID == owner && (employeeID == "" || a.EmployeeID == employeeID) {
			out = append(out, a)
		}
	}
	return out, nil
}
func SaveEmployeePayrollActivity(ctx context.Context, a EmployeePayrollActivity) error {
	row := buildRow(employeePayrollActivityTable, func(k string) string {
		switch k {
		case "activity_id":
			return a.ID
		case "owner_id":
			return a.OwnerID
		case "employee_id":
			return a.EmployeeID
		case "period":
			return a.Period
		case "action":
			return a.Action
		case "actor_id":
			return a.ActorID
		case "occurred_at":
			return a.OccurredAt
		case "detail":
			return a.Detail
		case "entity_type":
			return a.EntityType
		case "entity_id":
			return a.EntityID
		}
		return ""
	})
	return appendTable(ctx, employeePayrollActivityTable, [][]string{row})
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
