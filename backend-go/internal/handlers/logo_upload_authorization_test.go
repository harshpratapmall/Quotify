package handlers

import "testing"

func TestLogoUploadAuthorizationRoundTrip(t *testing.T) {
	t.Setenv("AUTH_SESSION_SECRET", "logo-upload-test-secret")
	ticket, err := createLogoUploadAuthorization("user-123")
	if err != nil {
		t.Fatalf("createLogoUploadAuthorization() error = %v", err)
	}
	userID, valid := readLogoUploadAuthorization(ticket)
	if !valid || userID != "user-123" {
		t.Fatalf("readLogoUploadAuthorization() = (%q, %v), want (%q, true)", userID, valid, "user-123")
	}
}
