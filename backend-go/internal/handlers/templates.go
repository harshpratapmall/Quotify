package handlers

import (
	"net/http"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

func ListTemplates(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	templates, err := sheets.ListTemplates(c.Request.Context(), ownerID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load templates."})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func CreateTemplate(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	template, ok := bindTemplate(c)
	if !ok {
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	template.ID, template.OwnerID, template.CreatedAt, template.UpdatedAt, template.Status = sheets.NewTemplateID(), ownerID, now, now, "active"
	if err := sheets.SaveTemplate(c.Request.Context(), template); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to save template."})
		return
	}
	c.JSON(http.StatusCreated, template)
}

func UpdateTemplate(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	existing, err := sheets.GetTemplate(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load template."})
		return
	}
	if existing.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found."})
		return
	}
	template, ok := bindTemplate(c)
	if !ok {
		return
	}
	template.ID, template.OwnerID, template.CreatedAt, template.UpdatedAt, template.Status, template.Row = existing.ID, ownerID, existing.CreatedAt, time.Now().UTC().Format(time.RFC3339), existing.Status, existing.Row
	if err := sheets.UpdateTemplate(c.Request.Context(), template); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update template."})
		return
	}
	c.JSON(http.StatusOK, template)
}

func DeleteTemplate(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	template, err := sheets.GetTemplate(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load template."})
		return
	}
	if template.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found."})
		return
	}
	if err := sheets.DeleteTemplate(c.Request.Context(), template.Row); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to delete template."})
		return
	}
	c.Status(http.StatusNoContent)
}

func bindTemplate(c *gin.Context) (sheets.Template, bool) {
	var template sheets.Template
	if err := c.ShouldBindJSON(&template); err != nil || strings.TrimSpace(template.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Template name is required."})
		return sheets.Template{}, false
	}
	template.Name = strings.TrimSpace(template.Name)
	return template, true
}
