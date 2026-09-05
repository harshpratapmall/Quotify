package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

type publicDocument struct {
	ID           string                 `json:"id"`
	DocumentType string                 `json:"documentType"`
	ClientName   string                 `json:"clientName"`
	ProjectName  string                 `json:"projectName"`
	Phone        string                 `json:"phone"`
	Email        string                 `json:"email"`
	Location     string                 `json:"siteLocation"`
	Date         string                 `json:"date"`
	Scope        string                 `json:"scopeOfWork"`
	IncludeGST   bool                   `json:"includeGst"`
	GSTRate      string                 `json:"gstRate"`
	Payload      interface{}            `json:"payload"`
	Subtotal     float64                `json:"subtotal"`
	Tax          float64                `json:"tax"`
	Total        float64                `json:"total"`
	Business     sheets.BusinessProfile `json:"business"`
	ExpiresAt    string                 `json:"expiresAt"`
}

func CreateQuotationShare(c *gin.Context) {
	createDocumentShare(c, "quotation")
}

func RevokeQuotationShare(c *gin.Context) {
	revokeDocumentShare(c, "quotation")
}

func createDocumentShare(c *gin.Context, documentType string) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	documentID := c.Param("id")
	quote, err := sheets.GetQuotation(c.Request.Context(), ownerID, documentID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load document."})
		return
	}
	if quote.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found."})
		return
	}
	if existing, err := sheets.GetOwnerShareLink(c.Request.Context(), ownerID, documentType, documentID); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load share link."})
		return
	} else if existing.ID != "" {
		if err := sheets.RevokeShareLink(c.Request.Context(), existing, time.Now().UTC().Format(time.RFC3339)); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to rotate share link."})
			return
		}
	}
	token, tokenHash, err := sheets.NewShareToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create share link."})
		return
	}
	now := time.Now().UTC()
	link := sheets.ShareLink{ID: "SH-" + token[:12], OwnerID: ownerID, DocumentType: documentType, DocumentID: documentID, TokenHash: tokenHash, CreatedAt: now.Format(time.RFC3339), ExpiresAt: now.Add(30 * 24 * time.Hour).Format(time.RFC3339)}
	if err := sheets.SaveShareLink(c.Request.Context(), link); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to save share link."})
		return
	}
	quote.ShareLinkID = link.ID
	quote.UpdatedAt = now
	if err := sheets.UpdateQuotation(c.Request.Context(), quote); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to attach share link."})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": link.ID, "url": shareURL(token), "expiresAt": link.ExpiresAt})
}

func revokeDocumentShare(c *gin.Context, documentType string) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	link, err := sheets.GetOwnerShareLink(c.Request.Context(), ownerID, documentType, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load share link."})
		return
	}
	if link.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Active share link not found."})
		return
	}
	if err := sheets.RevokeShareLink(c.Request.Context(), link, time.Now().UTC().Format(time.RFC3339)); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to revoke share link."})
		return
	}
	c.Status(http.StatusNoContent)
}

func GetPublicShare(c *gin.Context) {
	hash := sha256.Sum256([]byte(strings.TrimSpace(c.Param("token"))))
	link, err := sheets.GetShareLink(c.Request.Context(), hex.EncodeToString(hash[:]))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load shared document."})
		return
	}
	if !sheets.ShareLinkIsActive(link, time.Now()) {
		c.JSON(http.StatusGone, gin.H{"error": "This share link has expired or been revoked."})
		return
	}
	if link.DocumentType != "quotation" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shared quotation not found."})
		return
	}
	quote, err := sheets.GetQuotation(c.Request.Context(), link.OwnerID, link.DocumentID)
	if err != nil || quote.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shared document not found."})
		return
	}
	profile, err := sheets.GetBusinessProfile(c.Request.Context(), link.OwnerID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load business branding."})
		return
	}
	_ = sheets.RecordShareView(c.Request.Context(), link, time.Now().UTC().Format(time.RFC3339))
	c.JSON(http.StatusOK, publicDocument{ID: quote.ID, DocumentType: link.DocumentType, ClientName: quote.Client, ProjectName: quote.Project, Phone: quote.Phone, Email: quote.Email, Location: quote.Location, Date: quote.QuoteDate, Scope: quote.Scope, IncludeGST: quote.IncludeGST, GSTRate: quote.GSTRate, Payload: quote.Payload, Subtotal: quote.Subtotal, Tax: quote.Tax, Total: quote.Total, Business: profile, ExpiresAt: link.ExpiresAt})
}

func shareURL(token string) string {
	return strings.TrimRight(frontendURL(), "/") + "/share/" + token
}
