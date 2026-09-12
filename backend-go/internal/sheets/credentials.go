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
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"backend-go/internal/config"
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
	PasswordHash  string
	Password      string
	GoogleSubject string
	GoogleEmail   string
	Row           int
}

var userMutationMu sync.Mutex

// ValidateConfiguration checks only local setup and never makes a Google request.
func ValidateConfiguration() error {
	if config.SheetID() == "" {
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
	debugAuthentication := config.AuthDebug()
	if debugAuthentication {
		log.Printf("auth debug: fetched %d sheet rows; submitted username=%q password_length=%d", len(users), username, len(password))
	}
	for rowIndex, record := range users {
		usernameMatches := strings.EqualFold(strings.TrimSpace(username), record.Username)
		passwordMatches := matchesPassword(record, password)
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

func matchesPassword(record UserRecord, password string) bool {
	if bcrypt.CompareHashAndPassword([]byte(record.PasswordHash), []byte(password)) == nil {
		return true
	}
	if record.Password == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(record.Password), []byte(password)) == 1
}

func ListUsers(ctx context.Context) ([]UserRecord, error) {
	values, err := readTable(ctx, usersTable)
	if err != nil {
		return nil, err
	}
	users := make([]UserRecord, 0, len(values))
	for index, row := range values {
		if len(row) < 6 || strings.TrimSpace(row[0]) == "" {
			continue
		}
		cells := usersTable.cells(row, true)
		users = append(users, UserRecord{
			User:          User{ID: cells.get("id"), Username: cells.get("username"), DisplayName: cells.get("display_name"), Role: cells.get("role"), Status: cells.get("status")},
			PasswordHash:  cells.get("bcrypt_hash"),
			Password:      cells.get("legacy_password"),
			GoogleSubject: cells.get("google_subject"),
			GoogleEmail:   cells.get("google_email"),
			Row:           index + 2,
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
	row := buildRow(usersTable, func(column string) string {
		switch column {
		case "id":
			return user.ID
		case "username":
			return user.Username
		case "bcrypt_hash":
			return string(hash)
		case "display_name":
			return user.DisplayName
		case "role":
			return "user"
		case "status":
			return "active"
		case "updated_at":
			return time.Now().UTC().Format(time.RFC3339)
		case "legacy_password":
			return password
		case "google_subject":
			return ""
		case "google_email":
			return ""
		}
		return ""
	})
	return appendTable(ctx, usersTable, [][]string{row})
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
			row := buildRow(usersTable, func(column string) string {
				switch column {
				case "id":
					return record.ID
				case "username":
					return record.Username
				case "bcrypt_hash":
					return record.PasswordHash
				case "display_name":
					return record.DisplayName
				case "role":
					return record.Role
				case "status":
					return status
				case "updated_at":
					return time.Now().UTC().Format(time.RFC3339)
				case "legacy_password":
					return record.Password
				case "google_subject":
					return record.GoogleSubject
				case "google_email":
					return record.GoogleEmail
				}
				return ""
			})
			return record.User, updateTableRow(ctx, usersTable, record.Row, row)
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
			row := buildRow(usersTable, func(column string) string {
				switch column {
				case "id":
					return record.ID
				case "username":
					return record.Username
				case "bcrypt_hash":
					return string(hash)
				case "display_name":
					return record.DisplayName
				case "role":
					return record.Role
				case "status":
					return "active"
				case "updated_at":
					return time.Now().UTC().Format(time.RFC3339)
				case "legacy_password":
					return password
				case "google_subject":
					return record.GoogleSubject
				case "google_email":
					return record.GoogleEmail
				}
				return ""
			})
			return record.User, updateTableRow(ctx, usersTable, record.Row, row)
		}
	}
	return User{}, errors.New("user not found")
}

// ResolveGoogleUser links a verified Google identity to an existing user or creates
// an active standard user while preserving the stable Quotify ID.
func ResolveGoogleUser(ctx context.Context, subject, email, displayName string) (User, error) {
	userMutationMu.Lock()
	defer userMutationMu.Unlock()

	users, err := ListUsers(ctx)
	if err != nil {
		return User{}, err
	}
	for _, record := range users {
		if record.GoogleSubject == subject {
			if !strings.EqualFold(record.Status, "active") {
				return User{}, errors.New("Google user is inactive")
			}
			return record.User, nil
		}
	}

	var match *UserRecord
	for index := range users {
		if recordEmail(users[index]) == recordEmailMatch(email, users) {
			if match != nil {
				return User{}, errors.New("Google email matches multiple users")
			}
			match = &users[index]
		}
	}
	if match != nil {
		if !strings.EqualFold(match.Status, "active") {
			return User{}, errors.New("Google user is inactive")
		}
		row := buildRow(usersTable, func(column string) string {
			switch column {
			case "id":
				return match.ID
			case "username":
				return match.Username
			case "bcrypt_hash":
				return match.PasswordHash
			case "display_name":
				return match.DisplayName
			case "role":
				return match.Role
			case "status":
				return match.Status
			case "updated_at":
				return time.Now().UTC().Format(time.RFC3339)
			case "legacy_password":
				return match.Password
			case "google_subject":
				return subject
			case "google_email":
				return email
			}
			return ""
		})
		if err := updateTableRow(ctx, usersTable, match.Row, row); err != nil {
			return User{}, err
		}
		return match.User, nil
	}

	user := User{ID: newUserID(), Username: email, DisplayName: displayName, Role: "user", Status: "active"}
	row := [][]string{{user.ID, user.Username, "", user.DisplayName, user.Role, user.Status, time.Now().UTC().Format(time.RFC3339), "", subject, email}}
	if err := appendTable(ctx, usersTable, row); err != nil {
		return User{}, err
	}
	return user, nil
}

func recordEmail(record UserRecord) string {
	if record.GoogleEmail != "" {
		return record.GoogleEmail
	}
	return record.Username
}

func recordEmailMatch(email string, users []UserRecord) string {
	for _, u := range users {
		if recordEmail(u) == email {
			return email
		}
	}
	return ""
}

func newUserID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("usr_%d", time.Now().UnixNano())
	}
	return "usr_" + fmt.Sprintf("%x", bytes)
}

func loadServiceAccount() (serviceAccount, error) {
	contents := config.ServiceAccountJSON()
	if contents == "" {
		filePath := config.ServiceAccountFile()
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