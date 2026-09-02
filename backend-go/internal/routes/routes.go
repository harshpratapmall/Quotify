package routes

import (
	"backend-go/internal/handlers"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.Use(cors())

	api := router.Group("/api")
	v1 := api.Group("/v1")
	{
		v1.GET("/ping", handlers.Ping)
		v1.GET("/auth/health", handlers.Health)
		v1.POST("/auth/login", handlers.Login)
		v1.POST("/auth/logout", handlers.Logout)
		v1.GET("/auth/me", handlers.Me)
	}
	return router
}

func cors() gin.HandlerFunc {
	allowedOrigins := map[string]struct{}{
		"http://localhost:3000":             {},
		"https://dev-quotify.intermesh.net": {},
		"https://quotify.intermesh.net":     {},
	}
	if configuredOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); configuredOrigins != "" {
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
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
