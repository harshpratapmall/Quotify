package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

var attendanceStatuses = map[string]bool{"present": true, "absent": true, "half_day": true, "paid_leave": true, "unpaid_leave": true}

func validAttendanceDate(value string) bool {
	_, err := time.ParseInLocation("2006-01-02", value, payrollLocation)
	return err == nil && len(value) == 10
}

func attendanceDateEditable(value string) bool {
	if !validAttendanceDate(value) {
		return false
	}
	today := payrollNow()
	return value >= today.AddDate(0, 0, -9).Format("2006-01-02") && value <= today.Format("2006-01-02")
}

func attendanceEmployee(c *gin.Context) (string, sheets.Employee, bool) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return "", sheets.Employee{}, false
	}
	employee, err := sheets.GetEmployee(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load employee.")
		return "", sheets.Employee{}, false
	}
	if employee.ID == "" {
		notFound(c, "Employee not found.")
		return "", sheets.Employee{}, false
	}
	return owner, employee, true
}

func attendanceActivity(c *gin.Context, owner string, item sheets.EmployeeAttendance, action, previous, next string) {
	user, _, _ := authenticatedUser(c)
	_ = sheets.SaveEmployeeAttendanceActivity(c.Request.Context(), sheets.EmployeeAttendanceActivity{
		ID: sheets.NewAttendanceID("ATA-"), OwnerID: owner, AttendanceID: item.ID, EmployeeID: item.EmployeeID,
		AttendanceDate: item.AttendanceDate, Action: action, PreviousStatus: previous, NewStatus: next,
		ActorID: user.ID, OccurredAt: payrollStamp(),
	})
}

func ListEmployeeAttendance(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	period := c.DefaultQuery("period", payrollNow().Format("2006-01"))
	if !validPayrollPeriod(period) {
		badRequest(c, "Provide a valid attendance month.")
		return
	}
	employees, err := sheets.ListEmployees(c.Request.Context(), owner)
	if err != nil {
		unavailable(c, "Unable to load employees.")
		return
	}
	items, err := sheets.ListEmployeeAttendance(c.Request.Context(), owner, period)
	if err != nil {
		unavailable(c, "Unable to load attendance.")
		return
	}
	byEmployee := map[string][]sheets.EmployeeAttendance{}
	for _, item := range items {
		byEmployee[item.EmployeeID] = append(byEmployee[item.EmployeeID], item)
	}
	rows := []gin.H{}
	for _, employee := range employees {
		if employee.Status == "inactive" {
			continue
		}
		records := byEmployee[employee.ID]
		sort.Slice(records, func(i, j int) bool { return records[i].AttendanceDate < records[j].AttendanceDate })
		counts := gin.H{"present": 0, "absent": 0, "half_day": 0, "paid_leave": 0, "unpaid_leave": 0}
		for _, record := range records {
			if count, valid := counts[record.Status].(int); valid {
				counts[record.Status] = count + 1
			}
		}
		rows = append(rows, gin.H{"employee": employee, "records": records, "counts": counts})
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i]["employee"].(sheets.Employee).Name < rows[j]["employee"].(sheets.Employee).Name
	})
	c.JSON(http.StatusOK, gin.H{"period": period, "employees": rows, "editableFrom": payrollNow().AddDate(0, 0, -9).Format("2006-01-02"), "editableThrough": payrollNow().Format("2006-01-02")})
}

func SaveEmployeeAttendance(c *gin.Context) {
	owner, employee, ok := attendanceEmployee(c)
	if !ok {
		return
	}
	date := c.Param("date")
	if !validAttendanceDate(date) || !attendanceDateEditable(date) {
		badRequest(c, "Attendance can be changed only for the most recent 10 calendar days.")
		return
	}
	if employee.Status != "active" {
		badRequest(c, "Reactivate this employee before recording attendance.")
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if c.ShouldBindJSON(&input) != nil {
		badRequest(c, "Provide a valid attendance status.")
		return
	}
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	if !attendanceStatuses[input.Status] {
		badRequest(c, "Attendance status is invalid.")
		return
	}
	existing, err := sheets.GetEmployeeAttendance(c.Request.Context(), owner, employee.ID, date)
	if err != nil {
		unavailable(c, "Unable to load attendance.")
		return
	}
	now := payrollStamp()
	action, previous := "created", ""
	if existing.ID == "" {
		existing = sheets.EmployeeAttendance{ID: sheets.NewAttendanceID("ATN-"), OwnerID: owner, EmployeeID: employee.ID, AttendanceDate: date, Status: input.Status, CreatedAt: now, UpdatedAt: now}
		err = sheets.SaveEmployeeAttendance(c.Request.Context(), existing)
	} else {
		action, previous = "updated", existing.Status
		existing.Status, existing.UpdatedAt = input.Status, now
		err = sheets.UpdateEmployeeAttendance(c.Request.Context(), existing)
	}
	if err != nil {
		unavailable(c, "Unable to save attendance.")
		return
	}
	attendanceActivity(c, owner, existing, action, previous, existing.Status)
	c.JSON(http.StatusOK, existing)
}

func ClearEmployeeAttendance(c *gin.Context) {
	owner, employee, ok := attendanceEmployee(c)
	if !ok {
		return
	}
	date := c.Param("date")
	if !validAttendanceDate(date) || !attendanceDateEditable(date) {
		badRequest(c, "Attendance can be changed only for the most recent 10 calendar days.")
		return
	}
	existing, err := sheets.GetEmployeeAttendance(c.Request.Context(), owner, employee.ID, date)
	if err != nil {
		unavailable(c, "Unable to load attendance.")
		return
	}
	if existing.ID == "" {
		notFound(c, "Attendance record not found.")
		return
	}
	if err := sheets.DeleteEmployeeAttendance(c.Request.Context(), existing.Row); err != nil {
		unavailable(c, "Unable to clear attendance.")
		return
	}
	attendanceActivity(c, owner, existing, "cleared", existing.Status, "")
	c.Status(http.StatusNoContent)
}
