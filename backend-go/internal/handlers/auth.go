package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
)

const sessionCookieName = "quotify_session"
const sessionDuration = time.Hour

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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to start a session."})
		return
	}
	setSessionCookie(c, token, int(sessionDuration.Seconds()))
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user, "expiresAt": expiresAt})
}

func RequireAdmin(c *gin.Context) {
	user, _, valid := authenticatedUser(c)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
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
	return readToken(cookie)
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

func createToken(user sheets.User) (string, int64, error) {
	expiresAt := time.Now().Add(sessionDuration).Unix()
	payloadBytes, err := json.Marshal(struct {
		User      sheets.User `json:"user"`
		ExpiresAt int64       `json:"expiresAt"`
	}{User: user, ExpiresAt: expiresAt})
	if err != nil {
		return "", 0, err
	}
	payload := string(payloadBytes)
	encodedPayload := base64.RawURLEncoding.EncodeToString([]byte(payload))
	mac := hmac.New(sha256.New, sessionSecret())
	if _, err := mac.Write([]byte(encodedPayload)); err != nil {
		return "", 0, err
	}
	return encodedPayload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), expiresAt, nil
}

func readToken(token string) (sheets.User, int64, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return sheets.User{}, 0, false
	}
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(parts[0]))
	expectedSignature := mac.Sum(nil)
	providedSignature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || subtle.ConstantTimeCompare(expectedSignature, providedSignature) != 1 {
		return sheets.User{}, 0, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
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

func sessionSecret() []byte {
	secret := os.Getenv("AUTH_SESSION_SECRET")
	if secret == "" {
		secret = "local-development-secret-change-me"
	}
	return []byte(secret)
}
