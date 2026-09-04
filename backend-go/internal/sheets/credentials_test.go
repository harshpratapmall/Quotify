package sheets

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestMatchesPasswordSupportsHashAndSheetFallback(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("hashed-password"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("GenerateFromPassword() error = %v", err)
	}
	if !matchesPassword(UserRecord{PasswordHash: string(hash)}, "hashed-password") {
		t.Fatal("bcrypt password should match")
	}
	if !matchesPassword(UserRecord{Password: "sheet-password"}, "sheet-password") {
		t.Fatal("sheet password fallback should match")
	}
}
