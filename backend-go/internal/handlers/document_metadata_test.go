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
	for _, status := range []string{"accepted", "declined"} {
		if !validQuotationStatus(status) {
			t.Errorf("status %q should be accepted", status)
		}
	}
	if validQuotationStatus("paid") {
		t.Fatal("payment status is not a quotation status")
	}
}
