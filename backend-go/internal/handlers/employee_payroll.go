package handlers

import (
	"backend-go/internal/sheets"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var payrollLocation, _ = time.LoadLocation("Asia/Kolkata")

func payrollNow() time.Time { return time.Now().In(payrollLocation) }
func payrollStamp() string  { return payrollNow().Format(time.RFC3339) }
func validPayrollPeriod(v string) bool {
	_, err := time.Parse("2006-01", v)
	return err == nil && len(v) == 7
}

type payrollSummary struct {
	sheets.EmployeePayroll
	Credits    float64                       `json:"credits"`
	Deductions float64                       `json:"deductions"`
	Advances   float64                       `json:"advances"`
	TotalDue   float64                       `json:"totalDue"`
	Paid       float64                       `json:"paid"`
	Balance    float64                       `json:"balance"`
	Status     string                        `json:"status"`
	State      string                        `json:"state"`
	Entries    []sheets.EmployeePayrollEntry `json:"entries"`
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
		return "", e, false
	}
	if e.ID == "" {
		notFound(c, "Employee not found.")
		return "", e, false
	}
	return owner, e, true
}
func activity(c *gin.Context, owner, employee, period, action, detail, entityType, entityID string) {
	user, _, _ := authenticatedUser(c)
	_ = sheets.SaveEmployeePayrollActivity(c.Request.Context(), sheets.EmployeePayrollActivity{ID: sheets.NewPayrollID("PAC-"), OwnerID: owner, EmployeeID: employee, Period: period, Action: action, ActorID: user.ID, OccurredAt: payrollStamp(), Detail: detail, EntityType: entityType, EntityID: entityID})
}
func locked(c *gin.Context, owner, employee, period string) bool {
	s, err := sheets.GetEmployeePayrollState(c.Request.Context(), owner, employee, period)
	if err != nil {
		unavailable(c, "Unable to load payroll state.")
		return true
	}
	if s.State == "finalized" {
		conflict(c, "This payroll month is finalized. Reopen it before making changes.")
		return true
	}
	return false
}

func buildPayrollSummary(p sheets.EmployeePayroll, entries []sheets.EmployeePayrollEntry, carried float64) (payrollSummary, float64) {
	s := payrollSummary{EmployeePayroll: p, Entries: entries}
	for _, e := range entries {
		switch e.Type {
		case "credit":
			if e.Period == p.Period {
				s.Credits += e.Amount
			}
		case "deduction":
			if e.Period == p.Period {
				s.Deductions += e.Amount
			}
		case "payment":
			if e.Period == p.Period {
				s.Paid += e.Amount
			}
		case "advance":
			if e.RecoveryPeriod == p.Period {
				s.Advances += e.Amount
			}
		}
	}
	available := s.BaseSalary + s.Credits - s.Deductions
	if available < 0 {
		available = 0
	}
	scheduled := s.Advances + carried
	recovered := scheduled
	if recovered > available {
		recovered = available
	}
	s.Advances = scheduled
	s.TotalDue = available - recovered
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
	return s, scheduled - recovered
}
func buildPayrollSummaries(records []sheets.EmployeePayroll, entries []sheets.EmployeePayrollEntry) []payrollSummary {
	sort.Slice(records, func(i, j int) bool { return records[i].Period < records[j].Period })
	out := make([]payrollSummary, 0, len(records))
	carry := 0.0
	for _, p := range records {
		s, next := buildPayrollSummary(p, entries, carry)
		carry = next
		out = append(out, s)
	}
	return out
}
func summariesWithStates(c *gin.Context, owner, employee string, records []sheets.EmployeePayroll, entries []sheets.EmployeePayrollEntry) ([]payrollSummary, error) {
	out := buildPayrollSummaries(records, entries)
	states, err := sheets.ListEmployeePayrollStates(c.Request.Context(), owner, employee)
	if err != nil {
		return nil, err
	}
	for i := range out {
		for _, s := range states {
			if s.Period == out[i].Period {
				out[i].State = s.State
			}
		}
	}
	return out, nil
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
	payroll, err := summariesWithStates(c, owner, e.ID, records, entries)
	if err != nil {
		unavailable(c, "Unable to load payroll state.")
		return
	}
	log, err := sheets.ListEmployeePayrollActivity(c.Request.Context(), owner, e.ID)
	if err != nil {
		unavailable(c, "Unable to load payroll activity.")
		return
	}
	sort.Slice(log, func(i, j int) bool { return log[i].OccurredAt > log[j].OccurredAt })
	c.JSON(http.StatusOK, gin.H{"employee": e, "payroll": payroll, "entries": entries, "activity": log})
}
func SaveEmployeePayroll(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	var in struct {
		Period     string  `json:"period"`
		BaseSalary float64 `json:"baseSalary"`
	}
	if c.ShouldBindJSON(&in) != nil || !validPayrollPeriod(in.Period) || in.BaseSalary < 0 {
		badRequest(c, "Provide a valid month and salary.")
		return
	}
	if e.Status == "inactive" {
		badRequest(c, "Reactivate this employee before creating a salary month.")
		return
	}
	if locked(c, owner, e.ID, in.Period) {
		return
	}
	p, err := sheets.GetEmployeePayrollRecord(c.Request.Context(), owner, e.ID, in.Period)
	if err != nil {
		unavailable(c, "Unable to load payroll.")
		return
	}
	now := payrollStamp()
	action := "salary_created"
	if p.ID == "" {
		p = sheets.EmployeePayroll{ID: sheets.NewPayrollID("PAY-"), OwnerID: owner, EmployeeID: e.ID, Period: in.Period, BaseSalary: in.BaseSalary, CreatedAt: now, UpdatedAt: now}
		err = sheets.SaveEmployeePayroll(c.Request.Context(), p)
	} else {
		action = "salary_updated"
		p.BaseSalary = in.BaseSalary
		p.UpdatedAt = now
		err = sheets.UpdateEmployeePayroll(c.Request.Context(), p)
	}
	if err != nil {
		unavailable(c, "Unable to save payroll.")
		return
	}
	activity(c, owner, e.ID, in.Period, action, "Base salary saved.", "payroll", p.ID)
	records, _ := sheets.ListEmployeePayroll(c.Request.Context(), owner, e.ID)
	entries, _ := sheets.ListEmployeePayrollEntries(c.Request.Context(), owner, e.ID)
	for _, s := range buildPayrollSummaries(records, entries) {
		if s.Period == in.Period {
			c.JSON(http.StatusOK, s)
			return
		}
	}
}
func bindPayrollEntry(c *gin.Context, owner string, e sheets.Employee) (sheets.EmployeePayrollEntry, bool) {
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
		if !validPayrollPeriod(v.RecoveryPeriod) || v.RecoveryPeriod < v.Period {
			badRequest(c, "Advance recovery month must be the same as or later than the advance month.")
			return v, false
		}
	}
	if v.EntryDate == "" {
		v.EntryDate = payrollNow().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", v.EntryDate); err != nil {
		badRequest(c, "Provide a valid entry date.")
		return v, false
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
	v, ok := bindPayrollEntry(c, owner, e)
	if !ok {
		return
	}
	if locked(c, owner, e.ID, v.Period) || (v.Type == "advance" && locked(c, owner, e.ID, v.RecoveryPeriod)) {
		return
	}
	now := payrollStamp()
	v.ID = sheets.NewPayrollID("PEN-")
	v.CreatedAt = now
	v.UpdatedAt = now
	if err := sheets.SaveEmployeePayrollEntry(c.Request.Context(), v); err != nil {
		unavailable(c, "Unable to save payroll entry.")
		return
	}
	activity(c, owner, e.ID, v.Period, "entry_created", v.Type, "entry", v.ID)
	c.JSON(http.StatusCreated, v)
}
func UpdateEmployeePayrollEntry(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	old, err := sheets.GetEmployeePayrollEntry(c.Request.Context(), owner, e.ID, c.Param("entryId"))
	if err != nil {
		unavailable(c, "Unable to load payroll entry.")
		return
	}
	if old.ID == "" {
		notFound(c, "Payroll entry not found.")
		return
	}
	v, ok := bindPayrollEntry(c, owner, e)
	if !ok {
		return
	}
	if locked(c, owner, e.ID, old.Period) || locked(c, owner, e.ID, v.Period) || (old.Type == "advance" && locked(c, owner, e.ID, old.RecoveryPeriod)) || (v.Type == "advance" && locked(c, owner, e.ID, v.RecoveryPeriod)) {
		return
	}
	v.ID = old.ID
	v.CreatedAt = old.CreatedAt
	v.UpdatedAt = payrollStamp()
	v.Row = old.Row
	if err := sheets.UpdateEmployeePayrollEntry(c.Request.Context(), v); err != nil {
		unavailable(c, "Unable to update payroll entry.")
		return
	}
	activity(c, owner, e.ID, v.Period, "entry_updated", v.Type, "entry", v.ID)
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
	if locked(c, owner, e.ID, v.Period) || (v.Type == "advance" && locked(c, owner, e.ID, v.RecoveryPeriod)) {
		return
	}
	if err := sheets.DeleteEmployeePayrollEntry(c.Request.Context(), v.Row); err != nil {
		unavailable(c, "Unable to delete payroll entry.")
		return
	}
	activity(c, owner, e.ID, v.Period, "entry_deleted", v.Type, "entry", v.ID)
	c.Status(http.StatusNoContent)
}
func EmployeePayrollOverview(c *gin.Context) { employeePayrollRegister(c, false) }
func EmployeePayrollRegister(c *gin.Context) { employeePayrollRegister(c, true) }

// EmployeePayrollExport returns the same owner-scoped register payload used by
// browser exports, keeping file rendering out of the API service.
func EmployeePayrollExport(c *gin.Context) { employeePayrollRegister(c, true) }
func employeePayrollRegister(c *gin.Context, detailed bool) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	period := c.DefaultQuery("period", payrollNow().Format("2006-01"))
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
	byEmployee := map[string][]sheets.EmployeePayroll{}
	for _, p := range records {
		byEmployee[p.EmployeeID] = append(byEmployee[p.EmployeeID], p)
	}
	total, paid, balance, unpaid, partial := 0.0, 0.0, 0.0, 0, 0
	rows := []gin.H{}
	for _, e := range employees {
		if e.Status == "inactive" && !detailed {
			continue
		}
		sums := buildPayrollSummaries(byEmployee[e.ID], entries)
		var current *payrollSummary
		for i := range sums {
			if sums[i].Period == period {
				current = &sums[i]
			}
		}
		if current != nil {
			total += current.TotalDue
			paid += current.Paid
			balance += current.Balance
			if current.Status == "unpaid" {
				unpaid++
			}
			if current.Status == "partially_paid" {
				partial++
			}
		}
		if detailed {
			status := "not_started"
			due, got, remaining := 0.0, 0.0, 0.0
			if current != nil {
				status = current.Status
				due = current.TotalDue
				got = current.Paid
				remaining = current.Balance
			}
			rows = append(rows, gin.H{"employee": e, "period": period, "totalDue": due, "paid": got, "balance": remaining, "status": status})
		}
	}
	active := 0
	for _, e := range employees {
		if e.Status != "inactive" {
			active++
		}
	}
	out := gin.H{"period": period, "headcount": len(employees), "activeHeadcount": active, "totalDue": total, "paid": paid, "balance": balance, "unpaid": unpaid, "partiallyPaid": partial}
	if detailed {
		out["employees"] = rows
	}
	c.JSON(http.StatusOK, out)
}
func SetEmployeePayrollFinalization(c *gin.Context, final bool) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	period := c.Param("period")
	if !validPayrollPeriod(period) {
		badRequest(c, "Provide a valid payroll month.")
		return
	}
	s, err := sheets.GetEmployeePayrollState(c.Request.Context(), owner, e.ID, period)
	if err != nil {
		unavailable(c, "Unable to load payroll state.")
		return
	}
	user, _, _ := authenticatedUser(c)
	now := payrollStamp()
	if s.ID == "" {
		s = sheets.EmployeePayrollState{ID: sheets.NewPayrollID("PST-"), OwnerID: owner, EmployeeID: e.ID, Period: period}
	}
	if final {
		s.State = "finalized"
		s.LockedAt = now
		s.LockedBy = user.ID
	} else {
		s.State = "open"
		s.LockedAt = ""
		s.LockedBy = ""
	}
	s.UpdatedAt = now
	if err := sheets.SaveEmployeePayrollState(c.Request.Context(), s); err != nil {
		unavailable(c, "Unable to save payroll state.")
		return
	}
	action := "reopened"
	if final {
		action = "finalized"
	}
	activity(c, owner, e.ID, period, action, "Payroll month state changed.", "payroll_state", s.ID)
	c.JSON(http.StatusOK, s)
}
func GetEmployeePayslip(c *gin.Context) {
	owner, e, ok := employeeForPayroll(c)
	if !ok {
		return
	}
	period := c.Param("period")
	if !validPayrollPeriod(period) {
		badRequest(c, "Provide a valid payroll month.")
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
	for _, s := range buildPayrollSummaries(records, entries) {
		if s.Period == period {
			profile, err := sheets.GetBusinessProfile(c.Request.Context(), owner)
			if err != nil {
				unavailable(c, "Unable to load business profile.")
				return
			}
			c.JSON(http.StatusOK, gin.H{"employee": e, "payroll": s, "businessProfile": profile})
			return
		}
	}
	notFound(c, "Payroll month not found.")
}
