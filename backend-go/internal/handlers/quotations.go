package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
)

func quotationOwner(c *gin.Context) (string, bool) {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		return "", false
	}
	username, _, valid := readToken(cookie)
	return username, valid
}

func ListQuotations(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	quotes, err := sheets.ListQuotations(c.Request.Context(), owner)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load quotations."})
		return
	}
	c.JSON(http.StatusOK, quotes)
}

func GetQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load quotation."})
		return
	}
	if quote.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quotation not found."})
		return
	}
	c.JSON(http.StatusOK, quote)
}

func CreateQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	quote, ok := bindQuotation(c)
	if !ok {
		return
	}
	quote.ID = newQuotationID()
	quote.Owner = owner
	quote.CreatedAt = time.Now().UTC()
	quote.UpdatedAt = quote.CreatedAt
	if err := sheets.SaveQuotation(c.Request.Context(), quote); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to save quotation."})
		return
	}
	c.JSON(http.StatusCreated, quote)
}

func UpdateQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	existing, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load quotation."})
		return
	}
	if existing.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quotation not found."})
		return
	}
	quote, ok := bindQuotation(c)
	if !ok {
		return
	}
	quote.ID, quote.Owner, quote.Row, quote.CreatedAt = existing.ID, owner, existing.Row, existing.CreatedAt
	quote.UpdatedAt = time.Now().UTC()
	if err := sheets.UpdateQuotation(c.Request.Context(), quote); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update quotation."})
		return
	}
	c.JSON(http.StatusOK, quote)
}

func DeleteQuotation(c *gin.Context) {
	owner, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), owner, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load quotation."})
		return
	}
	if quote.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quotation not found."})
		return
	}
	if err := sheets.DeleteQuotation(c.Request.Context(), quote.Row); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to delete quotation."})
		return
	}
	c.Status(http.StatusNoContent)
}

func bindQuotation(c *gin.Context) (sheets.Quotation, bool) {
	var quote sheets.Quotation
	if err := c.ShouldBindJSON(&quote); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quotation."})
		return sheets.Quotation{}, false
	}
	return quote, true
}
func newQuotationID() string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes)
	return "Q-" + hex.EncodeToString(bytes)
}
