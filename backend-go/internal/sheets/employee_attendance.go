package sheets

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type EmployeeAttendance struct {
	ID             string `json:"id"`
	OwnerID        string `json:"ownerId"`
	EmployeeID     string `json:"employeeId"`
	AttendanceDate string `json:"attendanceDate"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	Row            int    `json:"-"`
}

type EmployeeAttendanceActivity struct {
	ID             string `json:"id"`
	OwnerID        string `json:"ownerId"`
	AttendanceID   string `json:"attendanceId"`
	EmployeeID     string `json:"employeeId"`
	AttendanceDate string `json:"attendanceDate"`
	Action         string `json:"action"`
	PreviousStatus string `json:"previousStatus"`
	NewStatus      string `json:"newStatus"`
	ActorID        string `json:"actorId"`
	OccurredAt     string `json:"occurredAt"`
}

func ListEmployeeAttendance(ctx context.Context, owner, period string) ([]EmployeeAttendance, error) {
	rows, err := readTable(ctx, employeeAttendanceTable)
	if err != nil {
		return nil, err
	}
	out := []EmployeeAttendance{}
	for i, row := range rows {
		a := attendanceFromRow(row, i+2)
		if a.ID != "" && a.OwnerID == owner && (period == "" || strings.HasPrefix(a.AttendanceDate, period+"-")) {
			out = append(out, a)
		}
	}
	return out, nil
}

func ListEmployeeAttendanceForEmployee(ctx context.Context, owner, employeeID string) ([]EmployeeAttendance, error) {
	items, err := ListEmployeeAttendance(ctx, owner, "")
	if err != nil {
		return nil, err
	}
	out := []EmployeeAttendance{}
	for _, item := range items {
		if item.EmployeeID == employeeID {
			out = append(out, item)
		}
	}
	return out, nil
}

func GetEmployeeAttendance(ctx context.Context, owner, employeeID, date string) (EmployeeAttendance, error) {
	items, err := ListEmployeeAttendance(ctx, owner, date[:7])
	if err != nil {
		return EmployeeAttendance{}, err
	}
	for _, item := range items {
		if item.EmployeeID == employeeID && item.AttendanceDate == date {
			return item, nil
		}
	}
	return EmployeeAttendance{}, nil
}

func SaveEmployeeAttendance(ctx context.Context, a EmployeeAttendance) error {
	return appendTable(ctx, employeeAttendanceTable, [][]string{attendanceToRow(a)})
}
func UpdateEmployeeAttendance(ctx context.Context, a EmployeeAttendance) error {
	return updateTableRow(ctx, employeeAttendanceTable, a.Row, attendanceToRow(a))
}
func DeleteEmployeeAttendance(ctx context.Context, row int) error {
	return deleteTableRow(ctx, employeeAttendanceTable, row)
}

func SaveEmployeeAttendanceActivity(ctx context.Context, a EmployeeAttendanceActivity) error {
	return appendTable(ctx, employeeAttendanceActivityTable, [][]string{buildRow(employeeAttendanceActivityTable, func(k string) string {
		switch k {
		case "activity_id":
			return a.ID
		case "owner_id":
			return a.OwnerID
		case "attendance_id":
			return a.AttendanceID
		case "employee_id":
			return a.EmployeeID
		case "attendance_date":
			return a.AttendanceDate
		case "action":
			return a.Action
		case "previous_status":
			return a.PreviousStatus
		case "new_status":
			return a.NewStatus
		case "actor_id":
			return a.ActorID
		case "occurred_at":
			return a.OccurredAt
		}
		return ""
	})})
}

func attendanceFromRow(row []string, number int) EmployeeAttendance {
	get := func(i int) string {
		if i < len(row) {
			return strings.TrimSpace(row[i])
		}
		return ""
	}
	return EmployeeAttendance{ID: get(0), OwnerID: get(1), EmployeeID: get(2), AttendanceDate: get(3), Status: get(4), CreatedAt: get(5), UpdatedAt: get(6), Row: number}
}
func attendanceToRow(a EmployeeAttendance) []string {
	return []string{a.ID, a.OwnerID, a.EmployeeID, a.AttendanceDate, a.Status, a.CreatedAt, a.UpdatedAt}
}
func NewAttendanceID(prefix string) string { return fmt.Sprintf("%s%d", prefix, time.Now().UnixNano()) }
