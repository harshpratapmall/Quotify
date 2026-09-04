package sheets

import (
	"context"
	"fmt"
	"net/http"
)

const billRange = "Bills!A:Q"

// Bill shares the editable data model used by quotations but is persisted separately.
type Bill = Quotation

func ListBills(ctx context.Context, owner string) ([]Bill, error) {
	values, err := readValues(ctx, "Bills!A2:Q")
	if err != nil {
		return nil, err
	}
	bills := make([]Bill, 0, len(values))
	for i, row := range values {
		if len(row) == 0 || row[0] == "" {
			continue
		}
		bill := fromRow(row, i+2)
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
	return writeValues(ctx, http.MethodPost, billRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{toRow(bill)})
}

func UpdateBill(ctx context.Context, bill Bill) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Bills!A%d:Q%d?valueInputOption=RAW", bill.Row, bill.Row), [][]string{toRow(bill)})
}

func DeleteBill(ctx context.Context, row int) error {
	return deleteDocumentRow(ctx, row, "Bills")
}
