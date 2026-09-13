package middleware

import (
	"net/http"
	"strings"

	"backend-go/internal/config"

	"github.com/gin-gonic/gin"
)

// CORS middleware allows the configured frontend origins to call the API with
// credentials while keeping CORS disabled for every other origin.
func CORS() gin.HandlerFunc {
	allowedOrigins := map[string]struct{}{
		"http://localhost:3000":                {},
		"https://dev-quotify.intermesh.net":    {},
		"https://quotify.intermesh.net":        {},
		"https://business-desk-net.vercel.app": {},
	}
	if configuredOrigins := config.CORSAllowedOrigins(); configuredOrigins != "" {
		allowedOrigins = make(map[string]struct{})
		for _, origin := range strings.Split(configuredOrigins, ",") {
			if origin = strings.TrimSpace(origin); origin != "" {
				allowedOrigins[origin] = struct{}{}
			}
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, allowed := allowedOrigins[origin]; allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
