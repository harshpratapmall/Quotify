package handlers

import (
	"crypto/rand"
	"encoding/hex"
)

func newID(prefix string) string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes)
	return prefix + hex.EncodeToString(bytes)
}

func newQuotationID() string {
	return newID("Q-")
}

func newBillID() string {
	return newID("B-")
}

func newUserID() string {
	return newID("usr_")
}
