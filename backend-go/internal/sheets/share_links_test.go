package sheets

import (
	"testing"
	"time"
)

func TestNewShareTokenIsHashableAndUnique(t *testing.T) {
	token, hash, err := NewShareToken()
	if err != nil || token == "" || hash == "" || token == hash {
		t.Fatalf("NewShareToken() = %q, %q, %v", token, hash, err)
	}
	second, _, err := NewShareToken()
	if err != nil || token == second {
		t.Fatal("share tokens should be random")
	}
}

func TestShareLinkIsActive(t *testing.T) {
	now := time.Now()
	if !ShareLinkIsActive(ShareLink{ID: "SH-1", ExpiresAt: now.Add(time.Hour).Format(time.RFC3339)}, now) {
		t.Fatal("future share link should be active")
	}
	if ShareLinkIsActive(ShareLink{ID: "SH-1", ExpiresAt: now.Add(-time.Hour).Format(time.RFC3339)}, now) {
		t.Fatal("expired share link should be inactive")
	}
	if ShareLinkIsActive(ShareLink{ID: "SH-1", RevokedAt: now.Format(time.RFC3339)}, now) {
		t.Fatal("revoked share link should be inactive")
	}
}
