package sheets

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"time"
)

const shareLinkTimeLayout = "02-01-2006 15:04:05"

var istLocation = func() *time.Location {
	location, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		location = time.FixedZone("IST", 5*3600+30*60)
	}
	return location
}()

func ISTTimestamp(t time.Time) string {
	return t.In(istLocation).Format(shareLinkTimeLayout)
}

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
	return appendTable(ctx, shareLinkTable, [][]string{shareLinkToRow(link)})
}

func GetShareLink(ctx context.Context, tokenHash string) (ShareLink, error) {
	values, err := readTable(ctx, shareLinkTable)
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
	return updateTableRow(ctx, shareLinkTable, link.Row, shareLinkToRow(link))
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
	cells := shareLinkTable.cells(row, true)
	viewCount := 0
	if value, err := strconv.Atoi(cells.get("view_count")); err == nil {
		viewCount = value
	}
	return ShareLink{ID: cells.get("share_id"), OwnerID: cells.get("owner_id"), DocumentType: cells.get("document_type"), DocumentID: cells.get("document_id"), TokenHash: cells.get("token_hash"), CreatedAt: cells.get("created_at"), ExpiresAt: cells.get("expires_at"), RevokedAt: cells.get("revoked_at"), FirstViewedAt: cells.get("first_viewed_at"), LastViewedAt: cells.get("last_viewed_at"), ViewCount: viewCount, Row: rowNumber}
}

func shareLinkToRow(link ShareLink) []string {
	return buildRow(shareLinkTable, func(column string) string {
		switch column {
		case "share_id":
			return link.ID
		case "owner_id":
			return link.OwnerID
		case "document_type":
			return link.DocumentType
		case "document_id":
			return link.DocumentID
		case "token_hash":
			return link.TokenHash
		case "created_at":
			return link.CreatedAt
		case "expires_at":
			return link.ExpiresAt
		case "revoked_at":
			return link.RevokedAt
		case "first_viewed_at":
			return link.FirstViewedAt
		case "last_viewed_at":
			return link.LastViewedAt
		case "view_count":
			return strconv.Itoa(link.ViewCount)
		}
		return ""
	})
}

const ShareLinkLifetime = 10 * time.Minute

func ShareLinkIsActive(link ShareLink, now time.Time) bool {
	if link.ID == "" || link.RevokedAt != "" {
		return false
	}
	expiresAt := link.ExpiresAt
	if expiresAt == "" && link.CreatedAt != "" {
		if created, err := parseShareLinkTime(link.CreatedAt); err == nil {
			expiresAt = created.Add(ShareLinkLifetime).Format(shareLinkTimeLayout)
		}
	}
	if expiresAt == "" {
		return true
	}
	expiry, err := parseShareLinkTime(expiresAt)
	return err == nil && now.Before(expiry)
}

func parseShareLinkTime(value string) (time.Time, error) {
	if parsed, err := time.ParseInLocation(shareLinkTimeLayout, value, istLocation); err == nil {
		return parsed, nil
	}
	return time.Parse(time.RFC3339, value)
}

func GetOwnerShareLink(ctx context.Context, ownerID, documentType, documentID string) (ShareLink, error) {
	values, err := readTable(ctx, shareLinkTable)
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