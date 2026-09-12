package sheets

import (
	"context"
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
	rows, err := readTable(ctx, businessProfileTable)
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
	row := buildRow(businessProfileTable, func(column string) string {
		switch column {
		case "user_id":
			return profile.UserID
		case "business_name":
			return profile.BusinessName
		case "logo_url":
			return profile.LogoURL
		case "phone":
			return profile.Phone
		case "email":
			return profile.Email
		case "address":
			return profile.Address
		case "gstin":
			return profile.GSTIN
		case "quote_prefix":
			return profile.QuotePrefix
		case "terms":
			return profile.Terms
		case "website":
			return profile.Website
		case "updated_at":
			return time.Now().UTC().Format(time.RFC3339)
		}
		return ""
	})
	if profile.Row > 0 {
		err = updateTableRow(ctx, businessProfileTable, profile.Row, row)
	} else {
		err = appendTable(ctx, businessProfileTable, [][]string{row})
	}
	return profile, err
}

func profileRow(row []string, rowNumber int) BusinessProfile {
	cells := businessProfileTable.cells(row, true)
	return BusinessProfile{UserID: cells.get("user_id"), BusinessName: cells.get("business_name"), LogoURL: cells.get("logo_url"), Phone: cells.get("phone"), Email: cells.get("email"), Address: cells.get("address"), GSTIN: cells.get("gstin"), QuotePrefix: cells.get("quote_prefix"), Terms: cells.get("terms"), Website: cells.get("website"), Row: rowNumber}
}