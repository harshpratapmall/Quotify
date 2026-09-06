package routes

import (
	"backend-go/internal/handlers"
	"backend-go/internal/middleware"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.Use(cors())
	router.Use(middleware.APILogger())

	api := router.Group("/api")
	v1 := api.Group("/v1")
	{
		v1.GET("/ping", handlers.Ping)
		v1.GET("/auth/health", handlers.Health)
		v1.POST("/auth/login", handlers.Login)
		v1.GET("/auth/google/start", handlers.GoogleLoginStart)
		v1.GET("/auth/google/callback", handlers.GoogleLoginCallback)
		v1.POST("/auth/logout", handlers.Logout)
		v1.GET("/auth/me", handlers.Me)
		v1.GET("/public/share/:token", handlers.GetPublicShare)

		// Authenticated routes
		auth := v1.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			auth.GET("/clients", handlers.ListClients)
			auth.POST("/clients", handlers.CreateClient)
			auth.GET("/clients/:id", handlers.GetClient)
			auth.PUT("/clients/:id", handlers.UpdateClient)
			auth.PATCH("/clients/:id/status", handlers.UpdateClientStatus)
			auth.GET("/templates", handlers.ListTemplates)
			auth.POST("/templates", handlers.CreateTemplate)
			auth.PUT("/templates/:id", handlers.UpdateTemplate)
			auth.DELETE("/templates/:id", handlers.DeleteTemplate)
			auth.GET("/business-profile", handlers.BusinessProfile)
			auth.PUT("/business-profile", handlers.SaveBusinessProfile)
			auth.GET("/quotations", handlers.ListQuotations)
			auth.POST("/quotations", handlers.CreateQuotation)
			auth.GET("/quotations/:id", handlers.GetQuotation)
			auth.PUT("/quotations/:id", handlers.UpdateQuotation)
			auth.DELETE("/quotations/:id", handlers.DeleteQuotation)
			auth.PATCH("/quotations/:id/status", handlers.UpdateQuotationStatus)
			auth.POST("/quotations/:id/share", handlers.CreateQuotationShare)
			auth.DELETE("/quotations/:id/share", handlers.RevokeQuotationShare)
			auth.POST("/quotations/:id/convert-to-bill", handlers.ConvertQuotationToBill)
			auth.GET("/bills", handlers.ListBills)
			auth.POST("/bills", handlers.CreateBill)
			auth.GET("/bills/:id", handlers.GetBill)
			auth.PUT("/bills/:id", handlers.UpdateBill)
			auth.DELETE("/bills/:id", handlers.DeleteBill)
			auth.PATCH("/bills/:id/status", handlers.UpdateBillStatus)
			auth.POST("/bills/:id/share", handlers.CreateBillShare)
			auth.DELETE("/bills/:id/share", handlers.RevokeBillShare)
		}

		admin := v1.Group("/admin")
		admin.Use(handlers.RequireAdmin)
		admin.GET("/users", handlers.ListUsers)
		admin.POST("/users", handlers.CreateUser)
		admin.PATCH("/users/:id/status", handlers.UpdateUserStatus)
		admin.POST("/users/:id/reset-password", handlers.ResetUserPassword)
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
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
