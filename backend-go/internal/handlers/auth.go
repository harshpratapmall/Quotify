package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend-go/internal/config"
	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

const sessionCookieName = "quotify_session"
const sessionDuration = time.Hour
const logoUploadAuthorizationDuration = 5 * time.Minute

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var request loginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		badRequest(c, "Username and password are required.")
		return
	}
	if err := sheets.ValidateConfiguration(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Local login configuration is incomplete.", "details": err.Error()})
		return
	}

	user, err := sheets.Authenticate(c.Request.Context(), request.Username, request.Password)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Login service is temporarily unavailable. Please try again.", "code": "login_dependency_unavailable"})
		return
	}
	if user.ID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect username or password."})
		return
	}

	token, expiresAt, err := createToken(user)
	if err != nil {
		internalError(c, "Unable to start a session.")
		return
	}
	setSessionCookie(c, token, int(sessionDuration.Seconds()))
	c.Set("user_id", user.ID)
	c.Set("analytics_username", user.Username)
	c.JSON(http.StatusOK, gin.H{"user": user, "expiresAt": expiresAt})
}

func Health(c *gin.Context) {
	if err := sheets.ValidateConfiguration(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "service": "authentication", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "authentication"})
}

func Me(c *gin.Context) {
	user, expiresAt, valid := authenticatedUser(c)
	if !valid {
		unauthorized(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user, "expiresAt": expiresAt})
}

// LogoUploadAuthorization issues a short-lived, opaque ticket for the Vercel
// Blob upload handler. The browser's session cookie is scoped to the Render
// API domain and cannot be forwarded to Vercel directly.
func LogoUploadAuthorization(c *gin.Context) {
	user, _, valid := authenticatedUser(c)
	if !valid {
		unauthorized(c)
		return
	}
	ticket, err := createLogoUploadAuthorization(user.ID)
	if err != nil {
		internalError(c, "Unable to authorize logo upload.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ticket": ticket})
}

// VerifyLogoUploadAuthorization lets the Vercel Blob handler verify a ticket
// without requiring the browser's Render-domain session cookie.
func VerifyLogoUploadAuthorization(c *gin.Context) {
	ticket := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
	userID, valid := readLogoUploadAuthorization(ticket)
	if !valid {
		unauthorized(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"userId": userID})
}

func RequireAdmin(c *gin.Context) {
	user, _, valid := authenticatedUser(c)
	if !valid {
		unauthorized(c)
		c.Abort()
		return
	}
	if !strings.EqualFold(user.Role, "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Administrator access is required."})
		c.Abort()
		return
	}
	c.Set("authenticatedUser", user)
	c.Next()
}

func authenticatedUser(c *gin.Context) (sheets.User, int64, bool) {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		return sheets.User{}, 0, false
	}
	user, expiresAt, valid := readToken(cookie)
	if valid {
		c.Set("username", user.Username)
		c.Set("user_id", user.ID)
	}
	return user, expiresAt, valid
}

// AuthenticatedUser exported for use in middleware
func AuthenticatedUser(c *gin.Context) (sheets.User, int64, bool) {
	return authenticatedUser(c)
}

func Logout(c *gin.Context) {
	setSessionCookie(c, "", -1)
	c.Status(http.StatusNoContent)
}

func setSessionCookie(c *gin.Context, value string, maxAge int) {
	secure := config.CookieSecure()
	// Browser requests use Vercel's same-origin /api rewrite. Lax keeps the
	// session first-party and avoids iPadOS blocking it as third-party state.
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookieName, value, maxAge, "/", "", secure, true)
}

func createToken(user sheets.User) (string, int64, error) {
	expiresAt := time.Now().Add(sessionDuration).Unix()
	payloadBytes, err := json.Marshal(struct {
		User      sheets.User `json:"user"`
		ExpiresAt int64       `json:"expiresAt"`
	}{User: user, ExpiresAt: expiresAt})
	if err != nil {
		return "", 0, err
	}
	return signPayload(payloadBytes), expiresAt, nil
}

func readToken(token string) (sheets.User, int64, bool) {
	payload := verifyPayload(token)
	if payload == nil {
		return sheets.User{}, 0, false
	}
	var claims struct {
		User      sheets.User `json:"user"`
		ExpiresAt int64       `json:"expiresAt"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil || claims.User.ID == "" {
		return sheets.User{}, 0, false
	}
	if time.Now().Unix() > claims.ExpiresAt {
		return sheets.User{}, 0, false
	}
	return claims.User, claims.ExpiresAt, true
}

func createLogoUploadAuthorization(userID string) (string, error) {
	payloadBytes, err := json.Marshal(struct {
		UserID    string `json:"userId"`
		ExpiresAt int64  `json:"expiresAt"`
	}{UserID: userID, ExpiresAt: time.Now().Add(logoUploadAuthorizationDuration).Unix()})
	if err != nil {
		return "", err
	}
	return signPayload(payloadBytes), nil
}

func readLogoUploadAuthorization(ticket string) (string, bool) {
	payload := verifyPayload(ticket)
	if payload == nil {
		return "", false
	}
	var claims struct {
		UserID    string `json:"userId"`
		ExpiresAt int64  `json:"expiresAt"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil || claims.UserID == "" || time.Now().Unix() > claims.ExpiresAt {
		return "", false
	}
	return claims.UserID, true
}

func sessionSecret() []byte {
	return []byte(config.SessionSecret())
}
