package sheets

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
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

	"golang.org/x/crypto/bcrypt"
)

const sheetsScope = "https://www.googleapis.com/auth/spreadsheets"

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

type User struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

// ValidateConfiguration checks only local setup and never makes a Google request.
func ValidateConfiguration() error {
	if os.Getenv("GOOGLE_SHEET_ID") == "" {
		return errors.New("GOOGLE_SHEET_ID is not set")
	}
	_, err := loadServiceAccount()
	return err
}

func Authenticate(ctx context.Context, username, password string) (User, error) {
	if err := ValidateConfiguration(); err != nil {
		return User{}, err
	}
	spreadsheetID := os.Getenv("GOOGLE_SHEET_ID")
	account, err := loadServiceAccount()
	if err != nil {
		return User{}, err
	}
	accessToken, err := accessToken(ctx, account)
	if err != nil {
		return User{}, err
	}

	rangeName := os.Getenv("GOOGLE_SHEET_RANGE")
	if rangeName == "" {
		rangeName = "Users!A:G"
	}
	endpoint := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s", url.PathEscape(spreadsheetID), url.PathEscape(rangeName))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return User{}, err
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	response, err := newHTTPClient().Do(request)
	if err != nil {
		return User{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return User{}, fmt.Errorf("Google Sheets returned %s", response.Status)
	}

	var sheet valuesResponse
	if err := json.NewDecoder(response.Body).Decode(&sheet); err != nil {
		return User{}, err
	}
	debugAuthentication := os.Getenv("AUTH_DEBUG") == "true"
	if debugAuthentication {
		log.Printf("auth debug: fetched %d sheet rows; submitted username=%q password_length=%d", len(sheet.Values), username, len(password))
	}
	for rowIndex, row := range sheet.Values {
		if len(row) < 6 {
			if debugAuthentication {
				log.Printf("auth debug: row=%d skipped because it has fewer than two columns", rowIndex+1)
			}
			continue
		}
		sheetUserID := strings.TrimSpace(row[0])
		sheetUsername := strings.TrimSpace(row[1])
		sheetPasswordHash := strings.TrimSpace(row[2])
		usernameMatches := strings.EqualFold(strings.TrimSpace(username), sheetUsername)
		passwordMatches := bcrypt.CompareHashAndPassword([]byte(sheetPasswordHash), []byte(password)) == nil
		if debugAuthentication {
			log.Printf("auth debug: row=%d sheet_username=%q username_match=%t password_hash_length=%d password_match=%t", rowIndex+1, sheetUsername, usernameMatches, len(sheetPasswordHash), passwordMatches)
		}
		if usernameMatches && passwordMatches {
			if strings.EqualFold(strings.TrimSpace(row[5]), "active") {
				return User{ID: sheetUserID, Username: sheetUsername, DisplayName: strings.TrimSpace(row[3]), Role: strings.TrimSpace(row[4])}, nil
			}
		}
	}
	return User{}, nil
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
