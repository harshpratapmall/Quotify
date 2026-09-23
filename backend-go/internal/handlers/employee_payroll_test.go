package handlers

import (
	"backend-go/internal/sheets"
	"testing"
	"time"
)

func TestBuildPayrollSummariesCarriesAdvanceAcrossSkippedMonths(t *testing.T) {
	records := []sheets.EmployeePayroll{
		{EmployeeID: "E-1", Period: "2026-01", BaseSalary: 1000},
		{EmployeeID: "E-1", Period: "2026-03", BaseSalary: 1000},
	}
	entries := []sheets.EmployeePayrollEntry{{EmployeeID: "E-1", Period: "2026-01", Type: "advance", Amount: 1300, RecoveryPeriod: "2026-01"}}
	summaries := buildPayrollSummaries(records, entries)
	if summaries[0].TotalDue != 0 || summaries[1].TotalDue != 700 {
		t.Fatalf("expected recovery to carry into March, got January %.2f and March %.2f", summaries[0].TotalDue, summaries[1].TotalDue)
	}
}

func TestBuildPayrollSummaryDoesNotRecoverAdvanceBeforeScheduledMonth(t *testing.T) {
	p := sheets.EmployeePayroll{Period: "2026-01", BaseSalary: 1000}
	entries := []sheets.EmployeePayrollEntry{{Period: "2026-01", Type: "advance", Amount: 500, RecoveryPeriod: "2026-02"}}
	summary, carry := buildPayrollSummary(p, entries, 0)
	if summary.TotalDue != 1000 || carry != 0 {
		t.Fatalf("future advance must not reduce January salary: due %.2f carry %.2f", summary.TotalDue, carry)
	}
}

func TestPayrollValidation(t *testing.T) {
	if !validPayrollPeriod("2026-09") || validPayrollPeriod("2026-13") || validPayrollPeriod("2026-9") {
		t.Fatal("payroll period validation accepted an invalid calendar month")
	}
}

func TestAttendanceValidation(t *testing.T) {
	if !validAttendanceDate("2026-09-24") || validAttendanceDate("2026-9-24") || validAttendanceDate("2026-13-01") {
		t.Fatal("attendance date validation accepted an invalid calendar date")
	}
	if !attendanceStatuses["present"] || !attendanceStatuses["unpaid_leave"] || attendanceStatuses["holiday"] {
		t.Fatal("attendance statuses do not match the approved set")
	}
	today := payrollNow().Format("2006-01-02")
	if !attendanceDateEditable(today) || !attendanceDateEditable(payrollNow().AddDate(0, 0, -2).Format("2006-01-02")) {
		t.Fatal("attendance edit window should include today and the prior two days")
	}
	if attendanceDateEditable(payrollNow().AddDate(0, 0, -3).Format("2006-01-02")) || attendanceDateEditable(time.Now().In(payrollLocation).AddDate(0, 0, 1).Format("2006-01-02")) {
		t.Fatal("attendance edit window accepted a protected date")
	}
}
