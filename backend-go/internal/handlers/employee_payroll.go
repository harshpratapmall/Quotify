package handlers

import (
	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
	"net/http"
	"sort"
	"strings"
	"time"
)

type payrollSummary struct {
	sheets.EmployeePayroll
	Credits    float64                       `json:"credits"`
	Deductions float64                       `json:"deductions"`
	Advances   float64                       `json:"advances"`
	TotalDue   float64                       `json:"totalDue"`
	Paid       float64                       `json:"paid"`
	Balance    float64                       `json:"balance"`
	Status     string                        `json:"status"`
	Entries    []sheets.EmployeePayrollEntry `json:"entries"`
}

func validPayrollPeriod(v string) bool {
	_, err := time.Parse("2006-01", v)
	return err == nil && len(v) == 7
}
func employeeForPayroll(c *gin.Context) (string, sheets.Employee, bool) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return "", sheets.Employee{}, false
	}
	e, err := sheets.GetEmployee(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load employee.")
		return "", sheets.Employee{}, false
	}
	if e.ID == "" {
		notFound(c, "Employee not found.")
		return "", sheets.Employee{}, false
	}
	return owner, e, true
}
func buildPayrollSummary(p sheets.EmployeePayroll, entries []sheets.EmployeePayrollEntry, carriedAdvance float64) (payrollSummary, float64) {
	s := payrollSummary{EmployeePayroll: p, Entries: entries}
	for _, e := range entries {
		if e.Period != p.Period && !(e.Type == "advance" && e.RecoveryPeriod == p.Period) {
			continue
		}
		switch e.Type {
		case "credit":
			s.Credits += e.Amount
		case "deduction":
			s.Deductions += e.Amount
		case "advance":
			s.Advances += e.Amount
		case "payment":
			if e.Period == p.Period {
				s.Paid += e.Amount
			}
		}
	}
	available := s.BaseSalary + s.Credits - s.Deductions
	if available < 0 {
		available = 0
	}
	s.Advances += carriedAdvance
	advanceRecovered := s.Advances
	if advanceRecovered > available {
		advanceRecovered = available
	}
	s.TotalDue = available - advanceRecovered
	if s.TotalDue < 0 {
		s.TotalDue = 0
	}
	s.Balance = s.TotalDue - s.Paid
	if s.Paid == 0 && s.TotalDue > 0 {
		s.Status = "unpaid"
	} else if s.Paid < s.TotalDue {
		s.Status = "partially_paid"
	} else if s.Paid > s.TotalDue {
		s.Status = "overpaid"
	} else {
		s.Status = "paid"
	}
	return s, s.Advances - advanceRecovered
}

func buildPayrollSummaries(records []sheets.EmployeePayroll, entries []sheets.EmployeePayrollEntry) []payrollSummary {
	sort.Slice(records, func(i, j int) bool { return records[i].Period < records[j].Period })
	out := make([]payrollSummary, 0, len(records))
	carry := 0.0
	for _, p := range records {
		summary, nextCarry := buildPayrollSummary(p, entries, carry)
		carry = nextCarry
		out = append(out, summary)
	}
	return out
}
func GetEmployeePayroll(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	records, err := sheets.ListEmployeePayroll(c.Request.Context(), owner, e.ID)
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	entries, err := sheets.ListEmployeePayrollEntries(c.Request.Context(), owner, e.ID)
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	out := buildPayrollSummaries(records, entries)
	c.JSON(http.StatusOK, gin.H{"employee": e, "payroll": out, "entries": entries})
}
func SaveEmployeePayroll(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	if e.Status == "inactive" {
		badRequest(c, "Reactivate this employee before creating a salary month.")
		return
	}
	var input struct {
		Period     string  `json:"period"`
		BaseSalary float64 `json:"baseSalary"`
	}
	if c.ShouldBindJSON(&input) != nil || !validPayrollPeriod(input.Period) || input.BaseSalary < 0 {
		badRequest(c, "Provide a valid month and salary.")
		return
	}
	p, err := sheets.GetEmployeePayrollRecord(c.Request.Context(), owner, e.ID, input.Period)
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if p.ID == "" {
		p = sheets.EmployeePayroll{ID: sheets.NewPayrollID("PAY-"), OwnerID: owner, EmployeeID: e.ID, Period: input.Period, BaseSalary: input.BaseSalary, CreatedAt: now, UpdatedAt: now}
		err = sheets.SaveEmployeePayroll(c.Request.Context(), p)
	} else {
		p.BaseSalary = input.BaseSalary
		p.UpdatedAt = now
		err = sheets.UpdateEmployeePayroll(c.Request.Context(), p)
	}
	if err != nil {
		unavailable(c, "Unable to save payroll.")
		return
	}
	entries, err := sheets.ListEmployeePayrollEntries(c.Request.Context(), owner, e.ID)
	if err != nil {
		unavailable(c, "Unable to load payroll entries.")
		return
	}
	c.JSON(http.StatusOK, buildPayrollSummaries([]sheets.EmployeePayroll{p}, entries)[0])
}
func bindPayrollEntry(c *gin.Context, owner string, e sheets.Employee, existing *sheets.EmployeePayrollEntry) (sheets.EmployeePayrollEntry, bool) {
	var v sheets.EmployeePayrollEntry
	if c.ShouldBindJSON(&v) != nil || !validPayrollPeriod(v.Period) || v.Amount <= 0 {
		badRequest(c, "Provide a valid month and amount.")
		return v, false
	}
	v.Type = strings.ToLower(strings.TrimSpace(v.Type))
	if v.Type != "credit" && v.Type != "deduction" && v.Type != "advance" && v.Type != "payment" {
		badRequest(c, "Entry type is invalid.")
		return v, false
	}
	if v.Type == "advance" {
		if v.RecoveryPeriod == "" {
			v.RecoveryPeriod = v.Period
		}
		if !validPayrollPeriod(v.RecoveryPeriod) {
			badRequest(c, "Provide a valid advance recovery month.")
			return v, false
		}
	}
	if v.EntryDate == "" {
		v.EntryDate = time.Now().Format("2006-01-02")
	}
	v.OwnerID = owner
	v.EmployeeID = e.ID
	v.Label = strings.TrimSpace(v.Label)
	v.Note = strings.TrimSpace(v.Note)
	return v, true
}
func CreateEmployeePayrollEntry(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	v, ok := bindPayrollEntry(c, owner, e, nil)
	if !ok {
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	v.ID = sheets.NewPayrollID("PEN-")
	v.CreatedAt = now
	v.UpdatedAt = now
	if err := sheets.SaveEmployeePayrollEntry(c.Request.Context(), v); err != nil {
		unavailable(c, "Unable to save payroll entry.")
		return
	}
	c.JSON(http.StatusCreated, v)
}
func UpdateEmployeePayrollEntry(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	existing, err := sheets.GetEmployeePayrollEntry(c.Request.Context(), owner, e.ID, c.Param("entryId"))
	if err != nil {
		unavailable(c, "Unable to load payroll entry.")
		return
	}
	if existing.ID == "" {
		notFound(c, "Payroll entry not found.")
		return
	}
	v, ok := bindPayrollEntry(c, owner, e, &existing)
	if !ok {
		return
	}
	v.ID = existing.ID
	v.CreatedAt = existing.CreatedAt
	v.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	v.Row = existing.Row
	if err := sheets.UpdateEmployeePayrollEntry(c.Request.Context(), v); err != nil {
		unavailable(c, "Unable to update payroll entry.")
		return
	}
	c.JSON(http.StatusOK, v)
}
func DeleteEmployeePayrollEntry(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	v, err := sheets.GetEmployeePayrollEntry(c.Request.Context(), owner, e.ID, c.Param("entryId"))
	if err != nil {
		unavailable(c, "Unable to load payroll entry.")
		return
	}
	if v.ID == "" {
		notFound(c, "Payroll entry not found.")
		return
	}
	if err := sheets.DeleteEmployeePayrollEntry(c.Request.Context(), v.Row); err != nil {
		unavailable(c, "Unable to delete payroll entry.")
		return
	}
	c.Status(http.StatusNoContent)
}
func EmployeePayrollOverview(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	period := c.DefaultQuery("period", time.Now().Format("2006-01"))
	if !validPayrollPeriod(period) {
		badRequest(c, "Provide a valid payroll month.")
		return
	}
	employees, err := sheets.ListEmployees(c.Request.Context(), owner)
	if err != nil {
		unavailable(c, "Unable to load employees.")
		return
	}
	records, err := sheets.ListEmployeePayroll(c.Request.Context(), owner, "")
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	entries, err := sheets.ListEmployeePayrollEntries(c.Request.Context(), owner, "")
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	total, paid, balance := 0.0, 0.0, 0.0
	unpaid, partial := 0, 0
	for _, s := range buildPayrollSummaries(records, entries) {
		if s.Period != period {
			continue
		}
		total += s.TotalDue
		paid += s.Paid
		balance += s.Balance
		if s.Status == "unpaid" {
			unpaid++
		}
		if s.Status == "partially_paid" {
			partial++
		}
	}
	active := 0
	for _, e := range employees {
		if e.Status != "inactive" {
			active++
		}
	}
	c.JSON(http.StatusOK, gin.H{"period": period, "headcount": len(employees), "activeHeadcount": active, "totalDue": total, "paid": paid, "balance": balance, "unpaid": unpaid, "partiallyPaid": partial})
}
