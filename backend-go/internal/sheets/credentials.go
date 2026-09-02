package sheets

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const sheetsScope = "https://www.googleapis.com/auth/spreadsheets.readonly"

type serviceAccount struct {
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
	TokenURI    string `json:"token_uri"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
}

type valuesResponse struct {
	Values [][]string `json:"values"`
}

// ValidateConfiguration checks only local setup and never makes a Google request.
func ValidateConfiguration() error {
	if os.Getenv("GOOGLE_SHEET_ID") == "" {
		return errors.New("GOOGLE_SHEET_ID is not set")
	}
	_, err := loadServiceAccount()
	return err
}

func ValidateCredentials(ctx context.Context, username, password string) (bool, error) {
	if err := ValidateConfiguration(); err != nil {
		return false, err
	}
	spreadsheetID := os.Getenv("GOOGLE_SHEET_ID")
	account, err := loadServiceAccount()
	if err != nil {
		return false, err
	}
	accessToken, err := accessToken(ctx, account)
	if err != nil {
		return false, err
	}

	rangeName := os.Getenv("GOOGLE_SHEET_RANGE")
	if rangeName == "" {
		rangeName = "login!A:B"
	}
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s", url.PathEscape(spreadsheetID), url.PathEscape(rangeName))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	response, err := newHTTPClient().Do(request)
	if err != nil {
		return false, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return false, fmt.Errorf("Google Sheets returned %s", response.Status)
	}

	var sheet valuesResponse
	if err := json.NewDecoder(response.Body).Decode(&sheet); err != nil {
		return false, err
	}
	debugAuthentication := os.Getenv("AUTH_DEBUG") == "true"
	if debugAuthentication {
		log.Printf("auth debug: fetched %d sheet rows; submitted username=%q password_length=%d", len(sheet.Values), username, len(password))
	}
	for rowIndex, row := range sheet.Values {
		if len(row) < 2 {
			if debugAuthentication {
				log.Printf("auth debug: row=%d skipped because it has fewer than two columns", rowIndex+1)
			}
			continue
		}
		sheetUsername := strings.TrimSpace(row[0])
		sheetPassword := strings.TrimSpace(row[1])
		usernameMatches := subtle.ConstantTimeCompare([]byte(strings.TrimSpace(username)), []byte(sheetUsername)) == 1
		passwordMatches := subtle.ConstantTimeCompare([]byte(password), []byte(sheetPassword)) == 1
		if debugAuthentication {
			log.Printf("auth debug: row=%d sheet_username=%q username_match=%t sheet_password_length=%d password_match=%t", rowIndex+1, sheetUsername, usernameMatches, len(sheetPassword), passwordMatches)
		}
		if usernameMatches && passwordMatches {
			return true, nil
		}
	}
	return false, nil
}

func loadServiceAccount() (serviceAccount, error) {
	contents := os.Getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
	if contents == "" {
		filePath := os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
		if filePath == "" {
			return serviceAccount{}, errors.New("Google service account credentials are not configured")
		}
		fileContents, err := os.ReadFile(filePath)
		if err != nil {
			return serviceAccount{}, err
		}
		contents = string(fileContents)
	}

	var account serviceAccount
	if err := json.Unmarshal([]byte(contents), &account); err != nil {
		return serviceAccount{}, err
	}
	if account.ClientEmail == "" || account.PrivateKey == "" || account.TokenURI == "" {
		return serviceAccount{}, errors.New("service account JSON is incomplete")
	}
	return account, nil
}

func accessToken(ctx context.Context, account serviceAccount) (string, error) {
	privateKey, err := parsePrivateKey(account.PrivateKey)
	if err != nil {
		return "", err
	}
	now := time.Now()
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))
	claims, err := json.Marshal(map[string]any{
		"iss":   account.ClientEmail,
		"scope": sheetsScope,
		"aud":   account.TokenURI,
		"iat":   now.Unix(),
		"exp":   now.Add(time.Hour).Unix(),
	})
	if err != nil {
		return "", err
	}
	unsignedToken := header + "." + base64.RawURLEncoding.EncodeToString(claims)
	digest := sha256.Sum256([]byte(unsignedToken))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	assertion := unsignedToken + "." + base64.RawURLEncoding.EncodeToString(signature)

	form := url.Values{"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"}, "assertion": {assertion}}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, account.TokenURI, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := newHTTPClient().Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 1024))
		return "", fmt.Errorf("Google token request failed: %s", strings.TrimSpace(string(body)))
	}
	var token tokenResponse
	if err := json.NewDecoder(response.Body).Decode(&token); err != nil {
		return "", err
	}
	if token.AccessToken == "" {
		return "", errors.New("Google did not return an access token")
	}
	return token.AccessToken, nil
}

func parsePrivateKey(privateKey string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(privateKey))
	if block == nil {
		return nil, errors.New("invalid private key")
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("service account key is not RSA")
	}
	return rsaKey, nil
}

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 10 * time.Second}
}
