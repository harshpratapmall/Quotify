package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

func quotationOwner(c *gin.Context) (string, bool) {
	user, _, valid := authenticatedUser(c)
	return user.ID, valid
}

func ListQuotations(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	quotes, err := sheets.ListQuotations(c.Request.Context(), owner)
	if err != nil {
		unavailable(c, "Unable to load quotations.")
		return
	}
	c.JSON(http.StatusOK, quotes)
}

func GetQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load quotation.")
		return
	}
	if quote.ID == "" {
		notFound(c, "Quotation not found.")
		return
	}
	c.JSON(http.StatusOK, quote)
}

func CreateQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	quote, ok := bindQuotation(c)
	if !ok {
		return
	}
	quote.ID = newQuotationID()
	quote.Owner = owner
	quote.Status = "draft"
	quote.PaymentStatus = "unpaid"
	quote.Payments = ""
	quote.ShareLinkID, quote.ViewedAt, quote.SentAt = "", "", ""
	quote.CreatedAt = time.Now().UTC()
	quote.UpdatedAt = quote.CreatedAt
	if err := sheets.SaveQuotation(c.Request.Context(), quote); err != nil {
		unavailable(c, "Unable to save quotation.")
		return
	}
	c.JSON(http.StatusCreated, quote)
}

func UpdateQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	existing, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load quotation.")
		return
	}
	if existing.ID == "" {
		notFound(c, "Quotation not found.")
		return
	}
	quote, ok := bindQuotation(c)
	if !ok {
		return
	}
	quote.ID, quote.Owner, quote.Row, quote.CreatedAt = existing.ID, owner, existing.Row, existing.CreatedAt
	quote.Status, quote.ShareLinkID, quote.ViewedAt, quote.SentAt, quote.TemplateID, quote.SourceQuotationID = existing.Status, existing.ShareLinkID, existing.ViewedAt, existing.SentAt, existing.TemplateID, existing.SourceQuotationID
	quote.PaymentStatus, quote.Payments = existing.PaymentStatus, existing.Payments
	if !c.GetBool("clientIDProvided") {
		quote.ClientID = existing.ClientID
	}
	quote.UpdatedAt = time.Now().UTC()
	if err := sheets.UpdateQuotation(c.Request.Context(), quote); err != nil {
		unavailable(c, "Unable to update quotation.")
		return
	}
	c.JSON(http.StatusOK, quote)
}

func DeleteQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load quotation.")
		return
	}
	if quote.ID == "" {
		notFound(c, "Quotation not found.")
		return
	}
	if err := sheets.DeleteQuotation(c.Request.Context(), quote.Row); err != nil {
		unavailable(c, "Unable to delete quotation.")
		return
	}
	c.Status(http.StatusNoContent)
}

func UpdateQuotationStatus(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	var request struct {
		Status        string         `json:"status"`
		PaymentStatus string         `json:"paymentStatus"`
		Payments      []paymentInput `json:"payments"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || (request.Status == "" && request.PaymentStatus == "" && request.Payments == nil) {
		badRequest(c, "A quotation status, payment status, or payment record is required.")
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load quotation.")
		return
	}
	if quote.ID == "" {
		notFound(c, "Quotation not found.")
		return
	}
	if request.Status != "" {
		request.Status = strings.ToLower(strings.TrimSpace(request.Status))
		if !validQuotationStatus(request.Status) {
			badRequest(c, "Status must be draft, sent, viewed, accepted, declined, or cancelled.")
			return
		}
		quote.Status = request.Status
	}
	if request.Payments != nil {
		encoded, valid := encodePayments(request.Payments)
		if !valid {
			badRequest(c, "Each payment needs a valid date and a positive amount.")
			return
		}
		quote.Payments = encoded
		paid := 0.0
		for _, payment := range request.Payments {
			paid += payment.Amount
		}
		quote.PaymentStatus = derivePaymentStatus(paid, quote.Total)
	}
	if request.PaymentStatus != "" {
		request.PaymentStatus = strings.ToLower(strings.TrimSpace(request.PaymentStatus))
		if !validPaymentStatus(request.PaymentStatus) {
			badRequest(c, "Payment status must be unpaid, partially_paid, paid, or overdue.")
			return
		}
		quote.PaymentStatus = request.PaymentStatus
	}
	quote.UpdatedAt = time.Now().UTC()
	if quote.Status == "viewed" && quote.ViewedAt == "" {
		quote.ViewedAt = quote.UpdatedAt.Format(time.RFC3339)
	}
	if quote.Status == "sent" && quote.SentAt == "" {
		quote.SentAt = quote.UpdatedAt.Format(time.RFC3339)
	}
	if err := sheets.UpdateQuotation(c.Request.Context(), quote); err != nil {
		unavailable(c, "Unable to update quotation status.")
		return
	}
	c.JSON(http.StatusOK, quote)
}

func ConvertQuotationToBill(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load quotation.")
		return
	}
	if quote.ID == "" {
		notFound(c, "Quotation not found.")
		return
	}
	if quote.Status == "cancelled" || quote.Status == "declined" {
		badRequest(c, "Cancelled or declined quotations cannot be converted.")
		return
	}
	now := time.Now().UTC()
	bill := sheets.Bill{ID: newBillID(), CreatedAt: now, UpdatedAt: now, Owner: owner, Client: quote.Client, Project: quote.Project, Phone: quote.Phone, Email: quote.Email, Location: quote.Location, QuoteDate: quote.QuoteDate, Scope: quote.Scope, IncludeGST: quote.IncludeGST, GSTRate: quote.GSTRate, Payload: quote.Payload, Subtotal: quote.Subtotal, Tax: quote.Tax, Total: quote.Total, Status: "draft", ClientID: quote.ClientID, SourceQuotationID: quote.ID}
	bill.PaymentStatus, bill.Payments = carryQuotationPayments(quote.Payments, bill.Total)
	if err := sheets.SaveBill(c.Request.Context(), bill); err != nil {
		unavailable(c, "Unable to create bill.")
		return
	}
	c.JSON(http.StatusCreated, bill)
}

func carryQuotationPayments(encoded string, total float64) (string, string) {
	var payments []paymentInput
	if err := json.Unmarshal([]byte(encoded), &payments); err != nil || len(payments) == 0 {
		return "unpaid", ""
	}
	paid := 0.0
	for _, payment := range payments {
		paid += payment.Amount
	}
	return derivePaymentStatus(paid, total), encoded
}

func validQuotationStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "draft", "sent", "viewed", "accepted", "declined", "cancelled":
		return true
	default:
		return false
	}
}

func bindQuotation(c *gin.Context) (sheets.Quotation, bool) {
	return bindDocument(c, "Quotation")
}

func bindDocument(c *gin.Context, documentName string) (sheets.Quotation, bool) {
	var request struct {
		sheets.Quotation
		ClientID *string `json:"clientId"`
		DueDate  *string `json:"dueDate"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid " + strings.ToLower(documentName) + "."})
		return sheets.Quotation{}, false
	}
	quote := request.Quotation
	c.Set("clientIDProvided", request.ClientID != nil)
	c.Set("dueDateProvided", request.DueDate != nil)
	if request.ClientID != nil {
		quote.ClientID = strings.TrimSpace(*request.ClientID)
	}
	if request.DueDate != nil {
		quote.DueDate = strings.TrimSpace(*request.DueDate)
		if quote.DueDate != "" {
			if _, err := time.Parse("2006-01-02", quote.DueDate); err != nil {
				badRequest(c, "Due date must be a valid YYYY-MM-DD date.")
				return sheets.Quotation{}, false
			}
		}
	}
	if quote.ClientID != "" {
		owner, _ := quotationOwner(c)
		client, err := sheets.GetClient(c.Request.Context(), owner, quote.ClientID)
		if err != nil {
			unavailable(c, "Unable to verify client.")
			return sheets.Quotation{}, false
		}
		if client.ID == "" {
			badRequest(c, "Select a client from your own directory.")
			return sheets.Quotation{}, false
		}
	}
	if err := validateDocument(quote, documentName); err != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return sheets.Quotation{}, false
	}
	return quote, true
}

func validateDocument(quote sheets.Quotation, documentName string) string {
	if strings.TrimSpace(quote.Client) == "" {
		return "Client name is required."
	}
	if strings.TrimSpace(quote.Project) == "" {
		return "Project name is required."
	}
	if strings.TrimSpace(quote.Location) == "" {
		return "Site location is required."
	}
	if math.IsNaN(quote.Subtotal) || math.IsInf(quote.Subtotal, 0) || quote.Subtotal <= 0 {
		return documentName + " subtotal must be greater than zero."
	}
	if math.IsNaN(quote.Total) || math.IsInf(quote.Total, 0) || quote.Total <= 0 {
		return documentName + " total must be greater than zero."
	}
	var payload struct {
		Items []struct {
			Description string      `json:"description"`
			Quantity    interface{} `json:"quantity"`
			Rate        interface{} `json:"rate"`
		} `json:"items"`
	}
	if err := json.Unmarshal(quote.Payload, &payload); err != nil {
		return documentName + " items are invalid."
	}
	for _, item := range payload.Items {
		if strings.TrimSpace(item.Description) != "" && positiveNumber(item.Quantity) && positiveNumber(item.Rate) {
			return ""
		}
	}
	return "Add at least one item with a description, quantity, and rate."
}

func positiveNumber(value interface{}) bool {
	var number float64
	switch typedValue := value.(type) {
	case float64:
		number = typedValue
	case string:
		parsed, err := strconv.ParseFloat(typedValue, 64)
		if err != nil {
			return false
		}
		number = parsed
	default:
		return false
	}
	return !math.IsNaN(number) && !math.IsInf(number, 0) && number > 0
}
