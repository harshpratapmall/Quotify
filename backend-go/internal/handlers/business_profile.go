package handlers

import (
	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"strings"
)

func BusinessProfile(c *gin.Context) {
	user, _, ok := authenticatedUser(c)
	if !ok {
		unauthorized(c)
		return
	}
	profile, err := sheets.GetBusinessProfile(c.Request.Context(), user.ID)
	if err != nil {
		unavailable(c, "Unable to load business profile.")
		return
	}
	if profile.BusinessName == "" {
		profile.BusinessName = user.DisplayName
		profile.QuotePrefix = "QUOTE"
	}
	c.JSON(http.StatusOK, profile)
}
func SaveBusinessProfile(c *gin.Context) {
	user, _, ok := authenticatedUser(c)
	if !ok {
		unauthorized(c)
		return
	}
	var p sheets.BusinessProfile
	if c.ShouldBindJSON(&p) != nil || strings.TrimSpace(p.BusinessName) == "" {
		badRequest(c, "Business name is required.")
		return
	}
	p.UserID = user.ID
	saved, err := sheets.SaveBusinessProfile(c.Request.Context(), p)
	if err != nil {
		log.Printf("business profile save failed for user %q: %v", user.ID, err)
		unavailable(c, "Unable to save business profile.")
		return
	}
	c.JSON(http.StatusOK, saved)
}
