package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Shared response helpers keep the "error" JSON shape identical across handlers.
func unauthorized(c *gin.Context) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
}

func unavailable(c *gin.Context, message string) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": message})
}

func badRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": message})
}

func notFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, gin.H{"error": message})
}

func conflict(c *gin.Context, message string) {
	c.JSON(http.StatusConflict, gin.H{"error": message})
}

func internalError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": message})
}
