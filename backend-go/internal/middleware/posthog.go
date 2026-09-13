package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend-go/internal/config"

	"github.com/gin-gonic/gin"
)

const postHogEventName = "api_request_completed"

var postHogClient = &http.Client{Timeout: 2 * time.Second}
var postHogQueue = make(chan struct{}, 100)

// PostHog reports aggregate API usage without collecting request bodies,
// cookies, query strings, client details, or document content. Sending happens
// after the response and in a bounded background goroutine so analytics cannot
// delay or fail a customer request.
func PostHog() gin.HandlerFunc {
	apiKey := strings.TrimSpace(config.PostHogAPIKey())
	if apiKey == "" {
		return func(c *gin.Context) { c.Next() }
	}

	host := strings.TrimRight(strings.TrimSpace(config.PostHogHost()), "/")
	endpoint := host + "/capture/"
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()

		route := c.FullPath()
		if shouldSkipPostHog(route) {
			return
		}
		if route == "" {
			route = "unmatched"
		}

		distinctID := "anonymous"
		username := "anonymous"
		if userID, exists := c.Get("user_id"); exists {
			if id, ok := userID.(string); ok && id != "" {
				distinctID = anonymizedDistinctID(id)
			}
		}
		if usernameValue, exists := c.Get("analytics_username"); exists {
			if value, ok := usernameValue.(string); ok && value != "" {
				username = value
			}
		}

		payload, err := json.Marshal(postHogCapture{
			APIKey: apiKey,
			Event:  postHogEventName,
			Properties: map[string]any{
				// PostHog uses this reserved property to disable IP and GeoIP
				// collection for this server-originated event.
				"$ip":         "0",
				"distinct_id": distinctID,
				"endpoint":    route,
				"method":      c.Request.Method,
				"status_code": c.Writer.Status(),
				"duration_ms": time.Since(startedAt).Milliseconds(),
				"username":    username,
			},
		})
		if err != nil {
			return
		}

		// Avoid an unbounded number of goroutines if PostHog is unavailable.
		select {
		case postHogQueue <- struct{}{}:
			go sendPostHog(endpoint, payload)
		default:
		}
	}
}

type postHogCapture struct {
	APIKey     string         `json:"api_key"`
	Event      string         `json:"event"`
	Properties map[string]any `json:"properties"`
}

func shouldSkipPostHog(route string) bool {
	return route == "/ping" || route == "/api/v1/ping" || route == "/api/v1/auth/health"
}

func anonymizedDistinctID(userID string) string {
	mac := hmac.New(sha256.New, []byte(config.SessionSecret()))
	_, _ = mac.Write([]byte(userID))
	return "user_" + hex.EncodeToString(mac.Sum(nil))
}

func sendPostHog(endpoint string, payload []byte) {
	defer func() { <-postHogQueue }()
	request, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := postHogClient.Do(request)
	if err == nil && response != nil {
		_ = response.Body.Close()
	}
}
