package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
)

const sessionCookieName = "quotify_session"
const sessionDuration = 10 * time.Minute

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var request loginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required."})
		return
	}
	if err := sheets.ValidateConfiguration(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Local login configuration is incomplete.", "details": err.Error()})
		return
	}

	valid, err := sheets.ValidateCredentials(c.Request.Context(), request.Username, request.Password)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Login service is temporarily unavailable. Please try again.", "code": "login_dependency_unavailable"})
		return
	}
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect username or password."})
		return
	}

	token, expiresAt, err := createToken(request.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to start a session."})
		return
	}
	setSessionCookie(c, token, int(sessionDuration.Seconds()))
	c.JSON(http.StatusOK, gin.H{"username": request.Username, "expiresAt": expiresAt})
}

func Health(c *gin.Context) {
	if err := sheets.ValidateConfiguration(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "service": "authentication", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "authentication"})
}

func Me(c *gin.Context) {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}

	username, expiresAt, valid := readToken(cookie)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"username": username, "expiresAt": expiresAt})
}

func Logout(c *gin.Context) {
	setSessionCookie(c, "", -1)
	c.Status(http.StatusNoContent)
}

func setSessionCookie(c *gin.Context, value string, maxAge int) {
	secure, _ := strconv.ParseBool(os.Getenv("COOKIE_SECURE"))
	sameSite := http.SameSiteLaxMode
	if secure {
		// The Vercel frontend and Render API are cross-site, so production
		// requests need an explicit cross-site cookie policy.
		sameSite = http.SameSiteNoneMode
	}
	c.SetSameSite(sameSite)
	c.SetCookie(sessionCookieName, value, maxAge, "/", "", secure, true)
}

func createToken(username string) (string, int64, error) {
	expiresAt := time.Now().Add(sessionDuration).Unix()
	payload := fmt.Sprintf("%s|%d", username, expiresAt)
	encodedPayload := base64.RawURLEncoding.EncodeToString([]byte(payload))
	mac := hmac.New(sha256.New, sessionSecret())
	if _, err := mac.Write([]byte(encodedPayload)); err != nil {
		return "", 0, err
	}
	return encodedPayload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), expiresAt, nil
}

func readToken(token string) (string, int64, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", 0, false
	}
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(parts[0]))
	expectedSignature := mac.Sum(nil)
	providedSignature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || subtle.ConstantTimeCompare(expectedSignature, providedSignature) != 1 {
		return "", 0, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", 0, false
	}
	values := strings.Split(string(payload), "|")
	if len(values) != 2 || values[0] == "" {
		return "", 0, false
	}
	expiresAt, err := strconv.ParseInt(values[1], 10, 64)
	if err != nil || time.Now().Unix() > expiresAt {
		return "", 0, false
	}
	return values[0], expiresAt, true
}

func sessionSecret() []byte {
	secret := os.Getenv("AUTH_SESSION_SECRET")
	if secret == "" {
		secret = "local-development-secret-change-me"
	}
	return []byte(secret)
}
