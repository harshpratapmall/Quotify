package sheets

import (
	"testing"
	"time"
)

func TestQuotationRowPaymentColumns(t *testing.T) {
	row := make([]string, 26)
	row[0] = "Q-1"
	row[3] = "owner"
	row[24] = "partially_paid"
	row[25] = `[{"date":"2026-09-01","amount":2500}]`

	quote := fromRow(row, 2)
	if quote.PaymentStatus != "partially_paid" {
		t.Fatalf("paymentStatus = %q, want partially_paid", quote.PaymentStatus)
	}
	if quote.Payments != row[25] {
		t.Fatalf("payments not read from column Z: %q", quote.Payments)
	}

	out := toRow(quote)
	if len(out) != 26 {
		t.Fatalf("toRow returned %d columns, want 26", len(out))
	}
	if out[24] != "partially_paid" || out[25] != row[25] {
		t.Fatalf("payment columns not preserved: %+v", out)
	}
}

func TestQuotationLegacyRowTolerated(t *testing.T) {
	row := make([]string, 24)
	row[0] = "Q-1"
	row[3] = "owner"

	quote := fromRow(row, 2)
	if quote.PaymentStatus != "" || quote.Payments != "" {
		t.Fatalf("legacy row should yield empty payment fields, got %+v", quote)
	}
	out := toRow(quote)
	if len(out) != 26 {
		t.Fatalf("toRow should pad legacy rows to 26 columns, got %d", len(out))
	}
}

func TestQuotationRoundTripKeepsMetadata(t *testing.T) {
	quote := Quotation{ID: "Q-1", Owner: "owner", Status: "accepted", PaymentStatus: "paid", Payments: `[{"date":"2026-09-01","amount":10000}]`, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	round := fromRow(toRow(quote), 2)
	if round.Status != "accepted" || round.PaymentStatus != "paid" || round.Payments != quote.Payments {
		t.Fatalf("metadata mismatch after round trip: %+v", round)
	}
}