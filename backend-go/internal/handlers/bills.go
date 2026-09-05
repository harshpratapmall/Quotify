package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

func ListBills(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	bills, err := sheets.ListBills(c.Request.Context(), owner)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load bills."})
		return
	}
	c.JSON(http.StatusOK, bills)
}

func GetBill(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	bill, err := sheets.GetBill(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load bill."})
		return
	}
	if bill.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found."})
		return
	}
	c.JSON(http.StatusOK, bill)
}

func CreateBill(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	bill, ok := bindDocument(c, "Bill")
	if !ok {
		return
	}
	bill.ID = newBillID()
	bill.Owner = owner
	if bill.Status == "" {
		bill.Status = "draft"
	}
	if bill.PaymentStatus == "" {
		bill.PaymentStatus = "unpaid"
	}
	bill.CreatedAt = time.Now().UTC()
	bill.UpdatedAt = bill.CreatedAt
	if err := sheets.SaveBill(c.Request.Context(), bill); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to save bill."})
		return
	}
	c.JSON(http.StatusCreated, bill)
}

func UpdateBill(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	existing, err := sheets.GetBill(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load bill."})
		return
	}
	if existing.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found."})
		return
	}
	bill, ok := bindDocument(c, "Bill")
	if !ok {
		return
	}
	bill.ID, bill.Owner, bill.Row, bill.CreatedAt = existing.ID, owner, existing.Row, existing.CreatedAt
	bill.Status, bill.ClientID, bill.SourceQuotationID, bill.PaymentStatus, bill.DueDate, bill.TemplateID = existing.Status, existing.ClientID, existing.SourceQuotationID, existing.PaymentStatus, existing.DueDate, existing.TemplateID
	bill.UpdatedAt = time.Now().UTC()
	if err := sheets.UpdateBill(c.Request.Context(), bill); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update bill."})
		return
	}
	c.JSON(http.StatusOK, bill)
}

func DeleteBill(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	bill, err := sheets.GetBill(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load bill."})
		return
	}
	if bill.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found."})
		return
	}
	if err := sheets.DeleteBill(c.Request.Context(), bill.Row); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to delete bill."})
		return
	}
	c.Status(http.StatusNoContent)
}

func UpdateBillStatus(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	var request struct {
		Status        string `json:"status"`
		PaymentStatus string `json:"paymentStatus"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || (request.Status == "" && request.PaymentStatus == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A bill or payment status is required."})
		return
	}
	bill, err := sheets.GetBill(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load bill."})
		return
	}
	if bill.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bill not found."})
		return
	}
	if request.Status != "" {
		request.Status = strings.ToLower(strings.TrimSpace(request.Status))
		if !validBillStatus(request.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bill status must be draft, issued, or cancelled."})
			return
		}
		bill.Status = request.Status
	}
	if request.PaymentStatus != "" {
		request.PaymentStatus = strings.ToLower(strings.TrimSpace(request.PaymentStatus))
		if !validPaymentStatus(request.PaymentStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payment status must be unpaid, partially_paid, paid, overdue, or cancelled."})
			return
		}
		bill.PaymentStatus = request.PaymentStatus
	}
	bill.UpdatedAt = time.Now().UTC()
	if err := sheets.UpdateBill(c.Request.Context(), bill); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update bill status."})
		return
	}
	c.JSON(http.StatusOK, bill)
}

func validBillStatus(status string) bool {
	return status == "draft" || status == "issued" || status == "cancelled"
}

func validPaymentStatus(status string) bool {
	switch status {
	case "unpaid", "partially_paid", "paid", "overdue", "cancelled":
		return true
	default:
		return false
	}
}

func newBillID() string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes)
	return "B-" + hex.EncodeToString(bytes)
}
