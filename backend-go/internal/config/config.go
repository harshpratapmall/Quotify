package config

import (
	"os"
	"strconv"
)

// Centralized environment access keeps every backend setting in one file.
// All values are read at call time so .env values loaded by main still apply.

func SheetID() string {
	return os.Getenv("GOOGLE_SHEET_ID")
}

func ServiceAccountJSON() string {
	return os.Getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
}

func ServiceAccountFile() string {
	return os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
}

func SessionSecret() string {
	if secret := os.Getenv("AUTH_SESSION_SECRET"); secret != "" {
		return secret
	}
	return "local-development-secret-change-me"
}

func CookieSecure() bool {
	secure, _ := strconv.ParseBool(os.Getenv("COOKIE_SECURE"))
	return secure
}

func AuthDebug() bool {
	return os.Getenv("AUTH_DEBUG") == "true"
}


func SheetTabUsers() string {
	return os.Getenv("SHEET_TAB_USERS")
}

func SheetTabQuotations() string {
	return os.Getenv("SHEET_TAB_QUOTATIONS")
}

func SheetTabBills() string {
	return os.Getenv("SHEET_TAB_BILLS")
}

func SheetTabClients() string {
	return os.Getenv("SHEET_TAB_CLIENTS")
}

func SheetTabEmployees() string {
	return os.Getenv("SHEET_TAB_EMPLOYEES")
}

func SheetTabShareLinks() string {
	return os.Getenv("SHEET_TAB_SHARELINKS")
}

func SheetTabBusinessProfiles() string {
	return os.Getenv("SHEET_TAB_BUSINESS_PROFILES")
}
func Port() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return "8000"
}

func CORSAllowedOrigins() string {
	return os.Getenv("CORS_ALLOWED_ORIGINS")
}

func GoogleOAuthClientID() string {
	return os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
}

func GoogleOAuthClientSecret() string {
	return os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
}

func GoogleOAuthRedirectURL() string {
	return os.Getenv("GOOGLE_OAUTH_REDIRECT_URL")
}

func OAuthFrontendURL() string {
	return os.Getenv("OAUTH_FRONTEND_URL")
}

func GoogleAllowedDomains() string {
	return os.Getenv("GOOGLE_ALLOWED_DOMAINS")
}
