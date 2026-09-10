package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
)

// signPayload base64-encodes and HMAC-signs an opaque value using the session
// secret. Used for session cookies and Google OAuth state cookies.
func signPayload(payload []byte) string {
	encoded := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(encoded))
	return encoded + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// verifyPayload returns the original bytes of a signed token, or nil when the
// format is malformed or the signature does not match.
func verifyPayload(token string) []byte {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil
	}
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(parts[0]))
	provided, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || subtle.ConstantTimeCompare(mac.Sum(nil), provided) != 1 {
		return nil
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil
	}
	return payload
}
