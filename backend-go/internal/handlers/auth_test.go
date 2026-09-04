package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
)

func TestSessionTokenPreservesStableUserIdentity(t *testing.T) {
	user := sheets.User{ID: "usr_sample_001", Username: "quotify_user_01", DisplayName: "Quotify User 01", Role: "user"}
	token, expiresAt, err := createToken(user)
	if err != nil {
		t.Fatalf("createToken() error = %v", err)
	}
	decoded, decodedExpiry, valid := readToken(token)
	if !valid || decoded != user || decodedExpiry != expiresAt || time.Now().Unix() > decodedExpiry {
		t.Fatalf("readToken() = %#v, %d, %t; want %#v, %d, true", decoded, decodedExpiry, valid, user, expiresAt)
	}
}

func TestSessionCookieUsesCrossSitePolicyInProduction(t *testing.T) {
	t.Setenv("COOKIE_SECURE", "true")
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	setSessionCookie(context, "session-token", 600)

	cookie := recorder.Header().Get("Set-Cookie")
	for _, expected := range []string{"SameSite=None", "Secure", "HttpOnly"} {
		if !strings.Contains(cookie, expected) {
			t.Fatalf("Set-Cookie header %q does not contain %q", cookie, expected)
		}
	}
}

func TestSessionCookieUsesLocalPolicyForHTTP(t *testing.T) {
	t.Setenv("COOKIE_SECURE", "false")
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	setSessionCookie(context, "session-token", 600)

	cookie := recorder.Header().Get("Set-Cookie")
	if strings.Contains(cookie, "SameSite=None") || strings.Contains(cookie, "Secure") {
		t.Fatalf("local Set-Cookie header has production attributes: %q", cookie)
	}
}
