package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestGoogleOAuthStateRoundTrip(t *testing.T) {
	t.Setenv("AUTH_SESSION_SECRET", "test-secret")
	t.Setenv("COOKIE_SECURE", "false")
	state, err := newGoogleOAuthState()
	if err != nil {
		t.Fatalf("newGoogleOAuthState() error = %v", err)
	}

	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = request
	setOAuthStateCookie(context, state)
	request.AddCookie(response.Result().Cookies()[0])

	context, _ = gin.CreateTestContext(httptest.NewRecorder())
	context.Request = request
	decoded, err := readOAuthStateCookie(context)
	if err != nil || decoded != state {
		t.Fatalf("readOAuthStateCookie() = %#v, %v; want %#v", decoded, err, state)
	}
}

func TestGoogleOAuthStateRejectsExpiredState(t *testing.T) {
	t.Setenv("AUTH_SESSION_SECRET", "test-secret")
	state := googleOAuthState{State: "state", Verifier: "verifier", Nonce: "nonce", Expires: time.Now().Add(-time.Minute).Unix()}
	gin.SetMode(gin.TestMode)
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = request
	setOAuthStateCookie(context, state)
	request.AddCookie(response.Result().Cookies()[0])
	context, _ = gin.CreateTestContext(httptest.NewRecorder())
	context.Request = request
	if _, err := readOAuthStateCookie(context); err == nil {
		t.Fatal("expired OAuth state should be rejected")
	}
}

func TestAllowedGoogleEmail(t *testing.T) {
	t.Setenv("GOOGLE_ALLOWED_DOMAINS", "example.com,partners.example")
	if !allowedGoogleEmail("person@example.com") || !allowedGoogleEmail("person@partners.example") {
		t.Fatal("configured Google domains should be accepted")
	}
	if allowedGoogleEmail("person@other.example") || allowedGoogleEmail("not-an-email") {
		t.Fatal("unconfigured or invalid Google email should be rejected")
	}
}
