package sheets

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const quotationRange = "Quotations!A:Q"

type Quotation struct {
	ID         string          `json:"id"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	Owner      string          `json:"owner"`
	Client     string          `json:"clientName"`
	Project    string          `json:"projectName"`
	Phone      string          `json:"phone"`
	Email      string          `json:"email"`
	Location   string          `json:"siteLocation"`
	QuoteDate  string          `json:"quoteDate"`
	Scope      string          `json:"scopeOfWork"`
	IncludeGST bool            `json:"includeGst"`
	GSTRate    string          `json:"gstRate"`
	Payload    json.RawMessage `json:"payload"`
	Subtotal   float64         `json:"subtotal"`
	Tax        float64         `json:"tax"`
	Total      float64         `json:"total"`
	Row        int             `json:"-"`
}

func ListQuotations(ctx context.Context, owner string) ([]Quotation, error) {
	values, err := readValues(ctx, "Quotations!A2:Q")
	if err != nil {
		return nil, err
	}
	quotes := make([]Quotation, 0, len(values))
	for i, row := range values {
		if len(row) == 0 || row[0] == "" {
			continue
		}
		quote := fromRow(row, i+2)
		if quote.Owner == owner {
			quotes = append(quotes, quote)
		}
	}
	return quotes, nil
}

func GetQuotation(ctx context.Context, owner, id string) (Quotation, error) {
	quotes, err := ListQuotations(ctx, owner)
	if err != nil {
		return Quotation{}, err
	}
	for _, quote := range quotes {
		if quote.ID == id {
			return quote, nil
		}
	}
	return Quotation{}, nil
}

func SaveQuotation(ctx context.Context, quote Quotation) error {
	return writeValues(ctx, http.MethodPost, quotationRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{toRow(quote)})
}

func UpdateQuotation(ctx context.Context, quote Quotation) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Quotations!A%d:Q%d?valueInputOption=RAW", quote.Row, quote.Row), [][]string{toRow(quote)})
}

func DeleteQuotation(ctx context.Context, row int) error {
	account, err := loadServiceAccount()
	if err != nil {
		return err
	}
	token, err := accessToken(ctx, account)
	if err != nil {
		return err
	}
	sheetID, err := quotationSheetID(ctx, token)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]any{"requests": []any{map[string]any{"deleteDimension": map[string]any{"range": map[string]any{"sheetId": sheetID, "dimension": "ROWS", "startIndex": row - 1, "endIndex": row}}}}})
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s:batchUpdate", url.PathEscape(os.Getenv("GOOGLE_SHEET_ID")))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	response, err := newHTTPClient().Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("Google Sheets returned %s", response.Status)
	}
	return nil
}

func quotationSheetID(ctx context.Context, token string) (int, error) {
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s?fields=sheets.properties", url.PathEscape(os.Getenv("GOOGLE_SHEET_ID")))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	response, err := newHTTPClient().Do(req)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("Google Sheets returned %s", response.Status)
	}
	var metadata struct {
		Sheets []struct {
			Properties struct {
				SheetID int    `json:"sheetId"`
				Title   string `json:"title"`
			} `json:"properties"`
		} `json:"sheets"`
	}
	if err := json.NewDecoder(response.Body).Decode(&metadata); err != nil {
		return 0, err
	}
	for _, sheet := range metadata.Sheets {
		if sheet.Properties.Title == "Quotations" {
			return sheet.Properties.SheetID, nil
		}
	}
	return 0, fmt.Errorf("Quotations worksheet not found")
}

func readValues(ctx context.Context, rangeName string) ([][]string, error) {
	account, err := loadServiceAccount()
	if err != nil {
		return nil, err
	}
	token, err := accessToken(ctx, account)
	if err != nil {
		return nil, err
	}
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s", url.PathEscape(os.Getenv("GOOGLE_SHEET_ID")), url.PathEscape(rangeName))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := newHTTPClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google Sheets returned %s", resp.Status)
	}
	var body valuesResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	return body.Values, err
}

func writeValues(ctx context.Context, method, target string, values [][]string) error {
	account, err := loadServiceAccount()
	if err != nil {
		return err
	}
	token, err := accessToken(ctx, account)
	if err != nil {
		return err
	}
	body, err := json.Marshal(map[string]any{"values": values})
	if err != nil {
		return err
	}
	rangeName, query, _ := strings.Cut(target, "?")
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s", url.PathEscape(os.Getenv("GOOGLE_SHEET_ID")), url.PathEscape(rangeName))
	if query != "" {
		endpoint += "?" + query
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := newHTTPClient().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Google Sheets returned %s: %s", resp.Status, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func fromRow(row []string, rowNumber int) Quotation {
	get := func(i int) string {
		if i < len(row) {
			return row[i]
		}
		return ""
	}
	created, _ := time.Parse(time.RFC3339, get(1))
	updated, _ := time.Parse(time.RFC3339, get(2))
	include, _ := strconv.ParseBool(get(11))
	subtotal, _ := strconv.ParseFloat(get(14), 64)
	tax, _ := strconv.ParseFloat(get(15), 64)
	total, _ := strconv.ParseFloat(get(16), 64)
	payload := json.RawMessage(get(13))
	if !json.Valid(payload) {
		payload = json.RawMessage("{}")
	}
	return Quotation{ID: get(0), CreatedAt: created, UpdatedAt: updated, Owner: get(3), Client: get(4), Project: get(5), Phone: get(6), Email: get(7), Location: get(8), QuoteDate: get(9), Scope: get(10), IncludeGST: include, GSTRate: get(12), Payload: payload, Subtotal: subtotal, Tax: tax, Total: total, Row: rowNumber}
}

func toRow(q Quotation) []string {
	return []string{q.ID, q.CreatedAt.Format(time.RFC3339), q.UpdatedAt.Format(time.RFC3339), q.Owner, q.Client, q.Project, q.Phone, q.Email, q.Location, q.QuoteDate, q.Scope, strconv.FormatBool(q.IncludeGST), q.GSTRate, string(q.Payload), strconv.FormatFloat(q.Subtotal, 'f', 2, 64), strconv.FormatFloat(q.Tax, 'f', 2, 64), strconv.FormatFloat(q.Total, 'f', 2, 64)}
}
