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
	"sync"
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
	Status      string `json:"status"`
}

type UserRecord struct {
	User
	PasswordHash string
	Password     string
	Row          int
}

var userMutationMu sync.Mutex

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
	users, err := ListUsers(ctx)
	if err != nil {
		return User{}, err
	}
	debugAuthentication := os.Getenv("AUTH_DEBUG") == "true"
	if debugAuthentication {
		log.Printf("auth debug: fetched %d sheet rows; submitted username=%q password_length=%d", len(users), username, len(password))
	}
	for rowIndex, record := range users {
		usernameMatches := strings.EqualFold(strings.TrimSpace(username), record.Username)
		passwordMatches := bcrypt.CompareHashAndPassword([]byte(record.PasswordHash), []byte(password)) == nil
		if debugAuthentication {
			log.Printf("auth debug: row=%d sheet_username=%q username_match=%t password_hash_length=%d password_match=%t", rowIndex+2, record.Username, usernameMatches, len(record.PasswordHash), passwordMatches)
		}
		if usernameMatches && passwordMatches {
			if strings.EqualFold(record.Status, "active") {
				return record.User, nil
			}
		}
	}
	return User{}, nil
}

func ListUsers(ctx context.Context) ([]UserRecord, error) {
	values, err := readValues(ctx, "Users!A2:H")
	if err != nil {
		return nil, err
	}
	users := make([]UserRecord, 0, len(values))
	for index, row := range values {
		if len(row) < 6 || strings.TrimSpace(row[0]) == "" {
			continue
		}
		get := func(column int) string {
			if column < len(row) {
				return strings.TrimSpace(row[column])
			}
			return ""
		}
		users = append(users, UserRecord{
			User:         User{ID: get(0), Username: get(1), DisplayName: get(3), Role: get(4), Status: get(5)},
			PasswordHash: get(2),
			Password:     get(7),
			Row:          index + 2,
		})
	}
	return users, nil
}

func CreateUser(ctx context.Context, user User, password string) error {
	userMutationMu.Lock()
	defer userMutationMu.Unlock()
	users, err := ListUsers(ctx)
	if err != nil {
		return err
	}
	for _, existing := range users {
		if strings.EqualFold(existing.Username, user.Username) || existing.ID == user.ID {
			return errors.New("user already exists")
		}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return writeValues(ctx, http.MethodPost, "Users!A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{{user.ID, user.Username, string(hash), user.DisplayName, "user", "active", time.Now().UTC().Format(time.RFC3339), password}})
}

func UpdateUserStatus(ctx context.Context, id, status string) (User, error) {
	userMutationMu.Lock()
	defer userMutationMu.Unlock()
	users, err := ListUsers(ctx)
	if err != nil {
		return User{}, err
	}
	for _, record := range users {
		if record.ID == id {
			return record.User, writeValues(ctx, http.MethodPut, fmt.Sprintf("Users!A%d:H%d?valueInputOption=RAW", record.Row, record.Row), [][]string{{record.ID, record.Username, record.PasswordHash, record.DisplayName, record.Role, status, time.Now().UTC().Format(time.RFC3339), record.Password}})
		}
	}
	return User{}, errors.New("user not found")
}

func ResetUserPassword(ctx context.Context, id, password string) (User, error) {
	userMutationMu.Lock()
	defer userMutationMu.Unlock()
	users, err := ListUsers(ctx)
	if err != nil {
		return User{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	for _, record := range users {
		if record.ID == id {
			err := writeValues(ctx, http.MethodPut, fmt.Sprintf("Users!A%d:H%d?valueInputOption=RAW", record.Row, record.Row), [][]string{{record.ID, record.Username, string(hash), record.DisplayName, record.Role, "active", time.Now().UTC().Format(time.RFC3339), password}})
			return record.User, err
		}
	}
	return User{}, errors.New("user not found")
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
