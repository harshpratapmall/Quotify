package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const (
	googleStateCookie = "quotify_google_oauth_state"
	googleIssuer      = "https://accounts.google.com"
	googleStateTTL    = 10 * time.Minute
)

type googleOAuthState struct {
	State    string `json:"state"`
	Verifier string `json:"verifier"`
	Nonce    string `json:"nonce"`
	Expires  int64  `json:"expires"`
}

type googleClaims struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
}

func GoogleLoginStart(c *gin.Context) {
	config, err := googleOAuthConfig()
	if err != nil {
		googleAuthFailure(c, "Google login is not configured.")
		return
	}
	state, err := newGoogleOAuthState()
	if err != nil {
		googleAuthFailure(c, "Unable to start Google login.")
		return
	}
	setOAuthStateCookie(c, state)
	url := config.AuthCodeURL(state.State,
		oauth2.AccessTypeOnline,
		oauth2.S256ChallengeOption(state.Verifier),
		oauth2.SetAuthURLParam("prompt", "select_account"),
		oauth2.SetAuthURLParam("nonce", state.Nonce),
	)
	c.Redirect(http.StatusFound, url)
}

func GoogleLoginCallback(c *gin.Context) {
	config, err := googleOAuthConfig()
	if err != nil {
		googleAuthFailure(c, "Google login is not configured.")
		return
	}
	state, err := readOAuthStateCookie(c)
	if err != nil || c.Query("state") != state.State {
		googleAuthFailure(c, "Google login expired. Please try again.")
		return
	}
	clearOAuthStateCookie(c)
	if c.Query("error") != "" {
		googleAuthFailure(c, "Google login was cancelled.")
		return
	}

	token, err := config.Exchange(c.Request.Context(), c.Query("code"), oauth2.VerifierOption(state.Verifier))
	if err != nil {
		googleAuthFailure(c, "Unable to complete Google login.")
		return
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		googleAuthFailure(c, "Google did not return a valid identity.")
		return
	}

	provider, err := oidc.NewProvider(c.Request.Context(), googleIssuer)
	if err != nil {
		googleAuthFailure(c, "Unable to verify Google login.")
		return
	}
	idToken, err := provider.Verifier(&oidc.Config{ClientID: config.ClientID}).Verify(c.Request.Context(), rawIDToken)
	if err != nil {
		googleAuthFailure(c, "Unable to verify Google login.")
		return
	}
	claims := googleClaims{}
	if err := idToken.Claims(&claims); err != nil || claims.Subject == "" || !claims.EmailVerified || !strings.Contains(claims.Email, "@") || idToken.Nonce != state.Nonce {
		googleAuthFailure(c, "Google account verification failed.")
		return
	}
	if !allowedGoogleEmail(claims.Email) {
		googleAuthFailure(c, "This Google account is not allowed.")
		return
	}

	user, err := sheets.ResolveGoogleUser(c.Request.Context(), claims.Subject, strings.ToLower(strings.TrimSpace(claims.Email)), claims.Name)
	if err != nil {
		googleAuthFailure(c, "Unable to create or load your Quotify account.")
		return
	}
	tokenValue, _, err := createToken(user)
	if err != nil {
		googleAuthFailure(c, "Unable to start a session.")
		return
	}
	setSessionCookie(c, tokenValue, int(sessionDuration.Seconds()))
	c.Redirect(http.StatusFound, frontendURL())
}

func googleOAuthConfig() (*oauth2.Config, error) {
	clientID := strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"))
	redirectURL := strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"))
	frontend := strings.TrimSpace(os.Getenv("OAUTH_FRONTEND_URL"))
	if clientID == "" || clientSecret == "" || redirectURL == "" || frontend == "" {
		return nil, errors.New("Google OAuth environment is incomplete")
	}
	return &oauth2.Config{ClientID: clientID, ClientSecret: clientSecret, Endpoint: google.Endpoint, RedirectURL: redirectURL, Scopes: []string{oidc.ScopeOpenID, "email", "profile"}}, nil
}

func newGoogleOAuthState() (googleOAuthState, error) {
	state, err := randomURLValue(32)
	if err != nil {
		return googleOAuthState{}, err
	}
	verifier, err := randomURLValue(32)
	if err != nil {
		return googleOAuthState{}, err
	}
	nonce, err := randomURLValue(32)
	if err != nil {
		return googleOAuthState{}, err
	}
	return googleOAuthState{State: state, Verifier: verifier, Nonce: nonce, Expires: time.Now().Add(googleStateTTL).Unix()}, nil
}

func randomURLValue(size int) (string, error) {
	value := make([]byte, size)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func setOAuthStateCookie(c *gin.Context, state googleOAuthState) {
	payload, _ := json.Marshal(state)
	encoded := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, sessionSecret())
	mac.Write([]byte(encoded))
	value := encoded + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	secure, _ := strconvBool(os.Getenv("COOKIE_SECURE"))
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(googleStateCookie, value, int(googleStateTTL.Seconds()), "/", "", secure, true)
}

func readOAuthStateCookie(c *gin.Context) (googleOAuthState, error) {
	value, err := c.Cookie(googleStateCookie)
	if err != nil {
		return googleOAuthState{}, err
	}
	parts := strings.Split(value, ".")
	if len(parts) != 2 {
		return googleOAuthState{}, errors.New("invalid OAuth state")
	}
	mac := hmac.New(sha256.New, sessionSecret())
	mac.Write([]byte(parts[0]))
	signature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || subtle.ConstantTimeCompare(mac.Sum(nil), signature) != 1 {
		return googleOAuthState{}, errors.New("invalid OAuth state signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return googleOAuthState{}, err
	}
	state := googleOAuthState{}
	if err := json.Unmarshal(payload, &state); err != nil || state.State == "" || state.Verifier == "" || state.Nonce == "" || time.Now().Unix() > state.Expires {
		return googleOAuthState{}, errors.New("expired OAuth state")
	}
	return state, nil
}

func clearOAuthStateCookie(c *gin.Context) {
	secure, _ := strconvBool(os.Getenv("COOKIE_SECURE"))
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(googleStateCookie, "", -1, "/", "", secure, true)
}

func allowedGoogleEmail(email string) bool {
	configured := strings.TrimSpace(os.Getenv("GOOGLE_ALLOWED_DOMAINS"))
	if configured == "" {
		return true
	}
	parts := strings.Split(strings.ToLower(email), "@")
	if len(parts) != 2 {
		return false
	}
	for _, domain := range strings.Split(configured, ",") {
		if strings.TrimSpace(strings.ToLower(domain)) == parts[1] {
			return true
		}
	}
	return false
}

func frontendURL() string {
	value := strings.TrimSpace(os.Getenv("OAUTH_FRONTEND_URL"))
	return value
}

func googleAuthFailure(c *gin.Context, message string) {
	target, err := url.Parse(frontendURL())
	if err != nil || target.Scheme == "" || target.Host == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": message})
		return
	}
	query := target.Query()
	query.Set("oauth_error", message)
	target.RawQuery = query.Encode()
	c.Redirect(http.StatusFound, target.String())
}

func strconvBool(value string) (bool, error) {
	if value == "true" {
		return true, nil
	}
	if value == "false" || value == "" {
		return false, nil
	}
	return false, fmt.Errorf("invalid boolean")
}
