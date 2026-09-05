package sheets

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const shareLinkRange = "ShareLinks!A:K"

type ShareLink struct {
	ID            string `json:"id"`
	OwnerID       string `json:"ownerId"`
	DocumentType  string `json:"documentType"`
	DocumentID    string `json:"documentId"`
	TokenHash     string `json:"-"`
	CreatedAt     string `json:"createdAt"`
	ExpiresAt     string `json:"expiresAt"`
	RevokedAt     string `json:"revokedAt"`
	FirstViewedAt string `json:"firstViewedAt"`
	LastViewedAt  string `json:"lastViewedAt"`
	ViewCount     int    `json:"viewCount"`
	Row           int    `json:"-"`
}

func SaveShareLink(ctx context.Context, link ShareLink) error {
	return writeValues(ctx, http.MethodPost, shareLinkRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{shareLinkToRow(link)})
}

func GetShareLink(ctx context.Context, tokenHash string) (ShareLink, error) {
	values, err := readValues(ctx, "ShareLinks!A2:K")
	if err != nil {
		return ShareLink{}, err
	}
	for index, row := range values {
		link := shareLinkFromRow(row, index+2)
		if link.TokenHash == tokenHash {
			return link, nil
		}
	}
	return ShareLink{}, nil
}

func RevokeShareLink(ctx context.Context, link ShareLink, revokedAt string) error {
	link.RevokedAt = revokedAt
	return updateShareLink(ctx, link)
}

func RecordShareView(ctx context.Context, link ShareLink, viewedAt string) error {
	if link.FirstViewedAt == "" {
		link.FirstViewedAt = viewedAt
	}
	link.LastViewedAt = viewedAt
	link.ViewCount++
	return updateShareLink(ctx, link)
}

func updateShareLink(ctx context.Context, link ShareLink) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("ShareLinks!A%d:K%d?valueInputOption=RAW", link.Row, link.Row), [][]string{shareLinkToRow(link)})
}

func NewShareToken() (string, string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(value)
	hash := sha256.Sum256([]byte(token))
	return token, hex.EncodeToString(hash[:]), nil
}

func shareLinkFromRow(row []string, rowNumber int) ShareLink {
	get := func(index int) string {
		if index < len(row) {
			return strings.TrimSpace(row[index])
		}
		return ""
	}
	viewCount := 0
	if value, err := strconv.Atoi(get(10)); err == nil {
		viewCount = value
	}
	return ShareLink{ID: get(0), OwnerID: get(1), DocumentType: get(2), DocumentID: get(3), TokenHash: get(4), CreatedAt: get(5), ExpiresAt: get(6), RevokedAt: get(7), FirstViewedAt: get(8), LastViewedAt: get(9), ViewCount: viewCount, Row: rowNumber}
}

func shareLinkToRow(link ShareLink) []string {
	return []string{link.ID, link.OwnerID, link.DocumentType, link.DocumentID, link.TokenHash, link.CreatedAt, link.ExpiresAt, link.RevokedAt, link.FirstViewedAt, link.LastViewedAt, strconv.Itoa(link.ViewCount)}
}

func ShareLinkIsActive(link ShareLink, now time.Time) bool {
	if link.ID == "" || link.RevokedAt != "" {
		return false
	}
	if link.ExpiresAt == "" {
		return true
	}
	expiresAt, err := time.Parse(time.RFC3339, link.ExpiresAt)
	return err == nil && now.Before(expiresAt)
}

func GetOwnerShareLink(ctx context.Context, ownerID, documentType, documentID string) (ShareLink, error) {
	values, err := readValues(ctx, "ShareLinks!A2:K")
	if err != nil {
		return ShareLink{}, err
	}
	for index, row := range values {
		link := shareLinkFromRow(row, index+2)
		if link.OwnerID == ownerID && link.DocumentType == documentType && link.DocumentID == documentID && ShareLinkIsActive(link, time.Now()) {
			return link, nil
		}
	}
	return ShareLink{}, nil
}
