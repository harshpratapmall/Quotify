package sheets

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const templateRange = "Templates!A:N"

type Template struct {
	ID             string `json:"id"`
	OwnerID        string `json:"ownerId"`
	Name           string `json:"name"`
	DocumentType   string `json:"documentType"`
	PrimaryColor   string `json:"primaryColor"`
	SecondaryColor string `json:"secondaryColor"`
	AccentColor    string `json:"accentColor"`
	Terms          string `json:"terms"`
	Footer         string `json:"footer"`
	LogoURL        string `json:"logoUrl"`
	IsDefault      bool   `json:"isDefault"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	Status         string `json:"status"`
	Row            int    `json:"-"`
}

func ListTemplates(ctx context.Context, ownerID string) ([]Template, error) {
	values, err := readValues(ctx, "Templates!A2:N")
	if err != nil {
		return nil, err
	}
	templates := make([]Template, 0, len(values))
	for index, row := range values {
		template := templateFromRow(row, index+2)
		if template.ID != "" && template.OwnerID == ownerID {
			templates = append(templates, template)
		}
	}
	return templates, nil
}

func GetTemplate(ctx context.Context, ownerID, id string) (Template, error) {
	templates, err := ListTemplates(ctx, ownerID)
	if err != nil {
		return Template{}, err
	}
	for _, template := range templates {
		if template.ID == id {
			return template, nil
		}
	}
	return Template{}, nil
}

func SaveTemplate(ctx context.Context, template Template) error {
	return writeValues(ctx, http.MethodPost, templateRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{templateToRow(template)})
}

func UpdateTemplate(ctx context.Context, template Template) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Templates!A%d:N%d?valueInputOption=RAW", template.Row, template.Row), [][]string{templateToRow(template)})
}

func DeleteTemplate(ctx context.Context, row int) error {
	return deleteDocumentRow(ctx, row, "Templates")
}

func NewTemplateID() string {
	value := make([]byte, 8)
	if _, err := rand.Read(value); err != nil {
		return "TPL-" + fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "TPL-" + hex.EncodeToString(value)
}

func templateFromRow(row []string, rowNumber int) Template {
	get := func(index int) string {
		if index < len(row) {
			return strings.TrimSpace(row[index])
		}
		return ""
	}
	return Template{ID: get(0), OwnerID: get(1), Name: get(2), DocumentType: get(3), PrimaryColor: get(4), SecondaryColor: get(5), AccentColor: get(6), Terms: get(7), Footer: get(8), LogoURL: get(9), IsDefault: strings.EqualFold(get(10), "true"), CreatedAt: get(11), UpdatedAt: get(12), Status: get(13), Row: rowNumber}
}

func templateToRow(template Template) []string {
	return []string{template.ID, template.OwnerID, template.Name, template.DocumentType, template.PrimaryColor, template.SecondaryColor, template.AccentColor, template.Terms, template.Footer, template.LogoURL, fmt.Sprintf("%t", template.IsDefault), template.CreatedAt, template.UpdatedAt, template.Status}
}
