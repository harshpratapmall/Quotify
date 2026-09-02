package main

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"backend-go/internal/routes"
)

func main() {
	loadDotEnv(".env")
	loadProjectDotEnv()
	normalizeServiceAccountPath()
	log.Printf("Google Sheets login configuration loaded: %t", os.Getenv("GOOGLE_SHEET_ID") != "")
	router := routes.SetupRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

// loadProjectDotEnv finds backend-go/.env even if an IDE starts the server from
// cmd/server or a parent workspace directory.
func loadProjectDotEnv() {
	projectDirectory, ok := projectDirectory()
	if !ok {
		return
	}
	loadDotEnv(filepath.Join(projectDirectory, ".env"))
}

func normalizeServiceAccountPath() {
	credentialPath := os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
	if credentialPath == "" || filepath.IsAbs(credentialPath) {
		return
	}
	projectDirectory, ok := projectDirectory()
	if !ok {
		return
	}
	_ = os.Setenv("GOOGLE_SERVICE_ACCOUNT_FILE", filepath.Join(projectDirectory, credentialPath))
}

func projectDirectory() (string, bool) {
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", false
	}
	return filepath.Clean(filepath.Join(filepath.Dir(sourceFile), "..", "..")), true
}

// loadDotEnv supports local development without adding a configuration dependency.
// Existing environment variables always take precedence over values in .env.
func loadDotEnv(path string) {
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return
	}
	if err != nil {
		log.Printf("could not read %s: %v", path, err)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 || os.Getenv(strings.TrimSpace(parts[0])) != "" {
			continue
		}
		value := strings.Trim(strings.TrimSpace(parts[1]), "\"'")
		if err := os.Setenv(strings.TrimSpace(parts[0]), value); err != nil {
			log.Printf("could not set %s: %v", parts[0], err)
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("could not scan %s: %v", path, err)
	}
}
