package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestPostHogCapturesSanitizedRouteEvent(t *testing.T) {
	t.Setenv("POSTHOG_API_KEY", "project-key")
	t.Setenv("POSTHOG_HOST", "")
	t.Setenv("AUTH_SESSION_SECRET", "test-session-secret")

	received := make(chan postHogCapture, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			return
		}
		var capture postHogCapture
		if err := json.Unmarshal(body, &capture); err != nil {
			t.Error(err)
			return
		}
		received <- capture
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()
	t.Setenv("POSTHOG_HOST", server.URL)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", "user-123")
		c.Set("analytics_username", "amit")
		c.Next()
	})
	router.Use(PostHog())
	router.GET("/api/v1/quotations/:id", func(c *gin.Context) { c.Status(http.StatusOK) })

	request := httptest.NewRequest(http.MethodGet, "/api/v1/quotations/secret-document-id?token=secret", nil)
	request.Header.Set("Cookie", "quotify_session=secret-cookie")
	router.ServeHTTP(httptest.NewRecorder(), request)

	select {
	case capture := <-received:
		if capture.APIKey != "project-key" || capture.Event != postHogEventName {
			t.Fatalf("unexpected event: %#v", capture)
		}
		distinctID, ok := capture.Properties["distinct_id"].(string)
		if !ok || distinctID == "user-123" || distinctID == "anonymous" {
			t.Fatalf("distinct ID was not pseudonymized: %#v", capture.Properties["distinct_id"])
		}
		if capture.Properties["endpoint"] != "/api/v1/quotations/:id" {
			t.Fatalf("event included a non-parameterized route: %#v", capture.Properties)
		}
		if capture.Properties["username"] != "amit" {
			t.Fatalf("event omitted the username: %#v", capture.Properties)
		}
		if capture.Properties["$ip"] != "0" {
			t.Fatalf("event did not disable IP enrichment: %#v", capture.Properties)
		}
		if _, present := capture.Properties["authenticated"]; present {
			t.Fatal("redundant authenticated property was sent")
		}
		if _, leaked := capture.Properties["token"]; leaked {
			t.Fatal("query data leaked into telemetry")
		}
	case <-time.After(time.Second):
		t.Fatal("PostHog capture was not sent")
	}
}

func TestPostHogDisabledWithoutAPIKey(t *testing.T) {
	previous, present := os.LookupEnv("POSTHOG_API_KEY")
	_ = os.Unsetenv("POSTHOG_API_KEY")
	t.Cleanup(func() {
		if present {
			_ = os.Setenv("POSTHOG_API_KEY", previous)
		}
	})

	router := gin.New()
	router.Use(PostHog())
	router.GET("/api/v1/quotations", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/quotations", nil))
	if response.Code != http.StatusNoContent {
		t.Fatalf("expected request to proceed, got %d", response.Code)
	}
}
