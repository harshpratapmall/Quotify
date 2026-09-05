package sheets

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

const billRange = "Bills!A:W"

// Bill shares the editable data model used by quotations but is persisted separately.
type Bill = Quotation

func ListBills(ctx context.Context, owner string) ([]Bill, error) {
	values, err := readValues(ctx, "Bills!A2:W")
	if err != nil {
		return nil, err
	}
	bills := make([]Bill, 0, len(values))
	for i, row := range values {
		if len(row) == 0 || row[0] == "" {
			continue
		}
		bill := fromBillRow(row, i+2)
		if bill.Owner == owner {
			bills = append(bills, bill)
		}
	}
	return bills, nil
}

func GetBill(ctx context.Context, owner, id string) (Bill, error) {
	bills, err := ListBills(ctx, owner)
	if err != nil {
		return Bill{}, err
	}
	for _, bill := range bills {
		if bill.ID == id {
			return bill, nil
		}
	}
	return Bill{}, nil
}

func SaveBill(ctx context.Context, bill Bill) error {
	return writeValues(ctx, http.MethodPost, billRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{billToRow(bill)})
}

func UpdateBill(ctx context.Context, bill Bill) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Bills!A%d:W%d?valueInputOption=RAW", bill.Row, bill.Row), [][]string{billToRow(bill)})
}

func DeleteBill(ctx context.Context, row int) error {
	return deleteDocumentRow(ctx, row, "Bills")
}

func fromBillRow(row []string, rowNumber int) Bill {
	bill := fromRow(row, rowNumber)
	get := func(index int) string {
		if index < len(row) {
			return row[index]
		}
		return ""
	}
	bill.SourceQuotationID = get(19)
	bill.PaymentStatus = get(20)
	bill.DueDate = get(21)
	bill.TemplateID = get(22)
	return bill
}

func billToRow(bill Bill) []string {
	return []string{bill.ID, bill.CreatedAt.Format(time.RFC3339), bill.UpdatedAt.Format(time.RFC3339), bill.Owner, bill.Client, bill.Project, bill.Phone, bill.Email, bill.Location, bill.QuoteDate, bill.Scope, strconv.FormatBool(bill.IncludeGST), bill.GSTRate, string(bill.Payload), strconv.FormatFloat(bill.Subtotal, 'f', 2, 64), strconv.FormatFloat(bill.Tax, 'f', 2, 64), strconv.FormatFloat(bill.Total, 'f', 2, 64), bill.Status, bill.ClientID, bill.SourceQuotationID, bill.PaymentStatus, bill.DueDate, bill.TemplateID}
}
