const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const filenamePart = (value) => String(value || 'employee').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const pdfTools = async () => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable };
};

function header(pdf, title, period, profile = {}) {
  pdf.setFillColor('#19334c'); pdf.rect(0, 0, 210, 32, 'F'); pdf.setTextColor('#fff'); pdf.setFontSize(18); pdf.text(profile.businessName || 'Business Desk', 14, 14); pdf.setFontSize(11); pdf.text(title, 14, 23); pdf.text(period, 196, 23, { align: 'right' }); pdf.setTextColor('#19334c');
}
export async function downloadPayslip({ employee, payroll, businessProfile }) {
  const { jsPDF, autoTable } = await pdfTools();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' }); header(pdf, 'EMPLOYEE PAYSLIP', payroll.period, businessProfile);
  pdf.setFontSize(12); pdf.text(employee.name, 14, 44); pdf.setFontSize(9); pdf.text([employee.designation || 'Employee', employee.phone || '', employee.email || ''].filter(Boolean).join(' | '), 14, 51);
  autoTable(pdf, { startY: 62, theme: 'grid', head: [['Earnings and adjustments', 'Amount']], body: [['Base salary', money(payroll.baseSalary)], ['Credits', money(payroll.credits)], ['Deductions', money(payroll.deductions)], ['Advance recovery', money(payroll.advances)], ['Net salary due', money(payroll.totalDue)], ['Paid', money(payroll.paid)], ['Balance', money(payroll.balance)]], styles: { fontSize: 9 }, headStyles: { fillColor: '#33776c' } });
  pdf.setFontSize(8); pdf.setTextColor('#556'); pdf.text(`Generated ${new Date().toLocaleDateString('en-IN')}. This is a manager-generated payroll record.`, 14, 280); pdf.save(`payslip-${filenamePart(employee.name)}-${payroll.period}.pdf`);
}
export async function downloadPayrollSummary(register) {
  const { jsPDF, autoTable } = await pdfTools();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' }); header(pdf, 'MONTHLY PAYROLL SUMMARY', register.period);
  autoTable(pdf, { startY: 42, theme: 'grid', head: [['Employee', 'Status', 'Due', 'Paid', 'Balance']], body: (register.employees || []).map(({ employee, status, totalDue, paid, balance }) => [employee.name, status.replaceAll('_', ' '), money(totalDue), money(paid), money(balance)]), styles: { fontSize: 8 }, headStyles: { fillColor: '#33776c' } });
  pdf.save(`payroll-summary-${register.period}.pdf`);
}
