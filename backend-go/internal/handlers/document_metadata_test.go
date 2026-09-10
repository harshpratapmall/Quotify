package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBindDocumentMetadataCompatibility(t *testing.T) {
	for _, tc := range []struct {
		name, metadata, dueDate string
		provided, valid         bool
	}{
		{"legacy", "", "", false, true},
		{"clear", `,"clientId":"","dueDate":""`, "", true, true},
		{"date", `,"clientId":"","dueDate":"2026-10-01"`, "2026-10-01", true, true},
		{"invalid date", `,"dueDate":"2026-02-30"`, "", true, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			body := `{"clientName":"Customer","projectName":"Project","siteLocation":"Site","subtotal":100,"total":100,"payload":{"items":[{"description":"Desk","quantity":1,"rate":100}]}` + tc.metadata + `}`
			c.Request = httptest.NewRequest("POST", "/", strings.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")
			document, ok := bindDocument(c, "Bill")
			if ok != tc.valid {
				t.Fatalf("valid = %v, want %v", ok, tc.valid)
			}
			if !ok {
				return
			}
			if c.GetBool("clientIDProvided") != tc.provided || c.GetBool("dueDateProvided") != tc.provided {
				t.Fatal("metadata presence was not preserved")
			}
			if document.DueDate != tc.dueDate || document.Client != "Customer" {
				t.Fatalf("incorrect decoded document: %+v", document)
			}
		})
	}
}

func TestQuotationDecisionStatuses(t *testing.T) {
	for _, status := range []string{"accepted", "declined", "viewed"} {
		if !validQuotationStatus(status) {
			t.Errorf("status %q should be accepted", status)
		}
	}
	if validQuotationStatus("paid") {
		t.Fatal("payment status is not a quotation status")
	}
	if validQuotationStatus("expired") {
		t.Fatal("expired is no longer a quotation status")
	}
}

func TestEncodePayments(t *testing.T) {
	encoded, valid := encodePayments([]paymentInput{{Date: "2026-09-01", Amount: 1000}})
	if !valid || !strings.Contains(encoded, "2026-09-01") {
		t.Fatalf("valid payment failed to encode: %q %v", encoded, valid)
	}
	for _, invalid := range []paymentInput{
		{Date: "", Amount: 100},
		{Date: "2026-02-30", Amount: 100},
		{Date: "2026-09-01", Amount: 0},
		{Date: "2026-09-01", Amount: -1},
	} {
		if _, valid := encodePayments([]paymentInput{invalid}); valid {
			t.Fatalf("payment %+v should be invalid", invalid)
		}
	}
}

func TestDerivePaymentStatus(t *testing.T) {
	cases := []struct {
		paid, total float64
		want        string
	}{
		{0, 10000, "unpaid"},
		{2500, 10000, "partially_paid"},
		{10000, 10000, "paid"},
		{12000, 10000, "paid"},
	}
	for _, tc := range cases {
		if got := derivePaymentStatus(tc.paid, tc.total); got != tc.want {
			t.Errorf("derivePaymentStatus(%v,%v) = %q, want %q", tc.paid, tc.total, got, tc.want)
		}
	}
}

func TestQuotesShouldMarkViewed(t *testing.T) {
	for _, status := range []string{"", "draft", "sent"} {
		if !quotesShouldMarkViewed(status) {
			t.Fatalf("quotation status %q should advance to viewed", status)
		}
	}
	for _, status := range []string{"viewed", "accepted", "declined", "cancelled"} {
		if quotesShouldMarkViewed(status) {
			t.Fatalf("quotation status %q should not be overwritten", status)
		}
	}
}
