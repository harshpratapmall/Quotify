package handlers

import (
	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"net/url"
	"regexp"
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
	var request struct {
		sheets.BusinessProfile
		Website *string `json:"website"`
	}
	if c.ShouldBindJSON(&request) != nil || strings.TrimSpace(request.BusinessName) == "" {
		badRequest(c, "Business name is required.")
		return
	}
	p := request.BusinessProfile
	if request.Website != nil {
		website, ok := normalizeWebsite(*request.Website)
		if !ok {
			badRequest(c, "Website must be a valid HTTP or HTTPS address.")
			return
		}
		p.Website, p.WebsiteProvided = website, true
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

var websiteScheme = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9+.-]*:`)

func normalizeWebsite(value string) (string, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", true
	}
	if !websiteScheme.MatchString(value) {
		value = "https://" + value
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Hostname() == "" || parsed.User != nil {
		return "", false
	}
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", false
	}
	return parsed.String(), true
}
