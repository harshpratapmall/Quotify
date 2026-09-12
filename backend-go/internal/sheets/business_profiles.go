package sheets

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type BusinessProfile struct {
	UserID          string `json:"-"`
	BusinessName    string `json:"businessName"`
	LogoURL         string `json:"logoUrl"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	Address         string `json:"address"`
	GSTIN           string `json:"gstin"`
	QuotePrefix     string `json:"quotePrefix"`
	Terms           string `json:"terms"`
	Website         string `json:"website"`
	WebsiteProvided bool   `json:"-"`
	Row             int    `json:"-"`
}

func GetBusinessProfile(ctx context.Context, id string) (BusinessProfile, error) {
	rows, err := readValues(ctx, "BusinessProfiles!A2:K")
	if err != nil {
		return BusinessProfile{}, err
	}
	for index, row := range rows {
		if len(row) > 0 && row[0] == id {
			return profileRow(row, index+2), nil
		}
	}
	return BusinessProfile{}, nil
}

func SaveBusinessProfile(ctx context.Context, profile BusinessProfile) (BusinessProfile, error) {
	existing, err := GetBusinessProfile(ctx, profile.UserID)
	if err != nil {
		return profile, err
	}
	profile.Row = existing.Row
	if !profile.WebsiteProvided && profile.Website == "" {
		profile.Website = existing.Website
	}
	if profile.LogoURL == "" {
		profile.LogoURL = existing.LogoURL
	}
	row := []string{profile.UserID, profile.BusinessName, profile.LogoURL, profile.Phone, profile.Email, profile.Address, profile.GSTIN, profile.QuotePrefix, profile.Terms, time.Now().UTC().Format(time.RFC3339), profile.Website}
	if profile.Row > 0 {
		err = writeValues(ctx, http.MethodPut, fmt.Sprintf("BusinessProfiles!A%d:K%d?valueInputOption=RAW", profile.Row, profile.Row), [][]string{row})
	} else {
		err = writeValues(ctx, http.MethodPost, "BusinessProfiles!A:K:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{row})
	}
	return profile, err
}

func profileRow(row []string, rowNumber int) BusinessProfile {
	get := func(index int) string {
		if index < len(row) {
			return strings.TrimSpace(row[index])
		}
		return ""
	}
	return BusinessProfile{UserID: get(0), BusinessName: get(1), LogoURL: get(2), Phone: get(3), Email: get(4), Address: get(5), GSTIN: get(6), QuotePrefix: get(7), Terms: get(8), Website: get(10), Row: rowNumber}
}
