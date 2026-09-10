package sheets

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"backend-go/internal/config"
)

// doRequest builds an authenticated Google Sheets request against the configured
// spreadsheet, reusing the service account token exchange for every call.
func doRequest(ctx context.Context, method, endpoint string, body []byte, contentType string) (*http.Response, error) {
	account, err := loadServiceAccount()
	if err != nil {
		return nil, err
	}
	token, err := accessToken(ctx, account)
	if err != nil {
		return nil, err
	}
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return newHTTPClient().Do(req)
}

func spreadsheetBaseURL() string {
	return "https://sheets.googleapis.com/v4/spreadsheets/" + url.PathEscape(config.SheetID())
}

func readValues(ctx context.Context, rangeName string) ([][]string, error) {
	response, err := doRequest(ctx, http.MethodGet, spreadsheetBaseURL()+"/values/"+url.PathEscape(rangeName), nil, "")
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google Sheets returned %s", response.Status)
	}
	var body valuesResponse
	err = json.NewDecoder(response.Body).Decode(&body)
	return body.Values, err
}

func writeValues(ctx context.Context, method, target string, values [][]string) error {
	body, err := json.Marshal(map[string]any{"values": values})
	if err != nil {
		return err
	}
	rangeName, query, _ := strings.Cut(target, "?")
	endpoint := spreadsheetBaseURL() + "/values/" + url.PathEscape(rangeName)
	if query != "" {
		endpoint += "?" + query
	}
	response, err := doRequest(ctx, method, endpoint, body, "application/json")
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(response.Body)
		return fmt.Errorf("Google Sheets returned %s: %s", response.Status, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func worksheetID(ctx context.Context, worksheet string) (int, error) {
	response, err := doRequest(ctx, http.MethodGet, spreadsheetBaseURL()+"?fields=sheets.properties", nil, "")
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
		if sheet.Properties.Title == worksheet {
			return sheet.Properties.SheetID, nil
		}
	}
	return 0, fmt.Errorf("%s worksheet not found", worksheet)
}

func deleteDocumentRow(ctx context.Context, row int, worksheet string) error {
	sheetID, err := worksheetID(ctx, worksheet)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]any{"requests": []any{map[string]any{"deleteDimension": map[string]any{"range": map[string]any{"sheetId": sheetID, "dimension": "ROWS", "startIndex": row - 1, "endIndex": row}}}}})
	response, err := doRequest(ctx, http.MethodPost, spreadsheetBaseURL()+":batchUpdate", body, "application/json")
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("Google Sheets returned %s", response.Status)
	}
	return nil
}
