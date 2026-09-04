package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"backend-go/internal/sheets"
	"github.com/gin-gonic/gin"
)

type createUserRequest struct {
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"displayName" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

type userStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type resetPasswordRequest struct {
	Password string `json:"password" binding:"required"`
}

func ListUsers(c *gin.Context) {
	records, err := sheets.ListUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load users."})
		return
	}
	users := make([]sheets.User, 0, len(records))
	for _, record := range records {
		users = append(users, record.User)
	}
	c.JSON(http.StatusOK, users)
}

func CreateUser(c *gin.Context) {
	var request createUserRequest
	if err := c.ShouldBindJSON(&request); err != nil || len([]rune(request.Password)) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username, display name, and a password of at least 8 characters are required."})
		return
	}
	username := strings.TrimSpace(request.Username)
	displayName := strings.TrimSpace(request.DisplayName)
	if username == "" || displayName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and display name are required."})
		return
	}
	user := sheets.User{ID: newUserID(), Username: username, DisplayName: displayName, Role: "user", Status: "active"}
	if err := sheets.CreateUser(c.Request.Context(), user, request.Password); err != nil {
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{"error": "A user with that username already exists."})
			return
		}
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to create user."})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func UpdateUserStatus(c *gin.Context) {
	status := userStatusRequest{}
	if err := c.ShouldBindJSON(&status); err != nil || !validUserStatus(status.Status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be active or inactive."})
		return
	}
	currentUser, _ := c.Get("authenticatedUser")
	if user, ok := currentUser.(sheets.User); ok && user.ID == c.Param("id") && status.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot deactivate your own administrator account."})
		return
	}
	user, err := sheets.UpdateUserStatus(c.Request.Context(), c.Param("id"), strings.ToLower(status.Status))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found."})
		return
	}
	user.Status = strings.ToLower(status.Status)
	c.JSON(http.StatusOK, user)
}

func ResetUserPassword(c *gin.Context) {
	var request resetPasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil || len([]rune(request.Password)) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters."})
		return
	}
	user, err := sheets.ResetUserPassword(c.Request.Context(), c.Param("id"), request.Password)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found."})
		return
	}
	c.JSON(http.StatusOK, user)
}

func validUserStatus(status string) bool {
	status = strings.ToLower(strings.TrimSpace(status))
	return status == "active" || status == "inactive"
}

func newUserID() string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes)
	return "usr_" + hex.EncodeToString(bytes)
}
