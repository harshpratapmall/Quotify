package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// APILogger middleware logs API requests in a structured table format
func APILogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		user := c.GetString("username")
		if user == "" {
			user = "anonymous"
		}

		// Process request
		c.Next()

		// Calculate response time
		duration := time.Since(startTime)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Log in table format
		logTableEntry(method, path, statusCode, duration, user, clientIP, userAgent)
	}
}

func logTableEntry(method, path string, statusCode int, duration time.Duration, user, clientIP, userAgent string) {
	// Format duration
	durationStr := duration.String()
	if duration.Milliseconds() < 1 {
		durationStr = "<1ms"
	} else if duration.Milliseconds() < 1000 {
		durationStr = fmt.Sprintf("%dms", duration.Milliseconds())
	}

	// Truncate user agent if too long
	if len(userAgent) > 30 {
		userAgent = userAgent[:27] + "..."
	}

	// Print table header occasionally (could be handled differently in production)
	fmt.Printf(
		"\n┌─────────────────────────────────────────────────────────────────────────────────────────────────┐\n"+
		"│ API REQUEST LOG                                                                         │\n"+
		"├─────────────────────────────────────────────────────────────────────────────────────────────────┤\n"+
		"│ %-10s │ %-30s │ %-10s │ %-10s │ %-15s │\n"+
		"├─────────────────────────────────────────────────────────────────────────────────────────────────┤\n"+
		"│ %-10s │ %-30s │ %-10d │ %-10s │ %-15s │\n"+
		"├─────────────────────────────────────────────────────────────────────────────────────────────────┤\n"+
		"│ User: %-20s │ IP: %-20s │ Agent: %-30s │\n"+
		"└─────────────────────────────────────────────────────────────────────────────────────────────────┘\n",
		"METHOD", "PATH", "STATUS", "TIME", "DURATION",
		method, path, statusCode, time.Now().Format("15:04:05"), durationStr,
		user, clientIP, userAgent,
	)
}