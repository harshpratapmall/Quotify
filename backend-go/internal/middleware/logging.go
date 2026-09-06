package middleware

import (
	"fmt"
	"time"

	"backend-go/internal/handlers"

	"github.com/gin-gonic/gin"
)

// APILogger middleware logs API requests in a structured format with separators
func APILogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Try to get username from authentication
		user := "anonymous"
		if userValue, exists := c.Get("username"); exists {
			if username, ok := userValue.(string); ok && username != "" {
				user = username
			}
		}

		// Process request
		c.Next()

		// Calculate response time
		duration := time.Since(startTime)
		statusCode := c.Writer.Status()

		// Format duration
		durationStr := duration.String()
		if duration.Milliseconds() < 1 {
			durationStr = "<1ms"
		} else if duration.Milliseconds() < 1000 {
			durationStr = fmt.Sprintf("%dms", duration.Milliseconds())
		}

		// Log with separators
		fmt.Printf(
			"METHOD: %-8s │ PATH: %-50s │ STATUS: %-6d │ Process Time: %-10s │ Username: %s\n",
			method,
			path,
			statusCode,
			durationStr,
			user,
		)
	}
}

// AuthMiddleware sets user context for authenticated requests without blocking
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to authenticate, but don't block if it fails
		user, _, valid := handlers.AuthenticatedUser(c)
		if valid {
			c.Set("username", user.Username)
			c.Set("user_id", user.ID)
		}
		c.Next()
	}
}
