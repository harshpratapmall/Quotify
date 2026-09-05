package handlers

import (
	"net/http"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

func ListClients(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	clients, err := sheets.ListClients(c.Request.Context(), ownerID)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load clients."})
		return
	}
	query := strings.TrimSpace(strings.ToLower(c.Query("q")))
	if query != "" {
		filtered := clients[:0]
		for _, client := range clients {
			if strings.Contains(strings.ToLower(client.Name), query) || strings.Contains(strings.ToLower(client.Phone), query) || strings.Contains(strings.ToLower(client.Email), query) {
				filtered = append(filtered, client)
			}
		}
		clients = filtered
	}
	c.JSON(http.StatusOK, clients)
}

func GetClient(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	client, err := sheets.GetClient(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load client."})
		return
	}
	if client.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found."})
		return
	}
	c.JSON(http.StatusOK, client)
}

func CreateClient(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	client, ok := bindClient(c)
	if !ok {
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	client.ID = sheets.NewClientID()
	client.OwnerID = ownerID
	client.CreatedAt = now
	client.UpdatedAt = now
	client.Status = "active"
	if err := sheets.SaveClient(c.Request.Context(), client); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to save client."})
		return
	}
	c.JSON(http.StatusCreated, client)
}

func UpdateClient(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	existing, err := sheets.GetClient(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load client."})
		return
	}
	if existing.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found."})
		return
	}
	client, ok := bindClient(c)
	if !ok {
		return
	}
	client.ID = existing.ID
	client.OwnerID = ownerID
	client.CreatedAt = existing.CreatedAt
	client.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	client.Status = existing.Status
	client.Row = existing.Row
	if err := sheets.UpdateClient(c.Request.Context(), client); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update client."})
		return
	}
	c.JSON(http.StatusOK, client)
}

func UpdateClientStatus(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated."})
		return
	}
	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	if status != "active" && status != "archived" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be active or archived."})
		return
	}
	client, err := sheets.GetClient(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to load client."})
		return
	}
	if client.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found."})
		return
	}
	client.Status = status
	client.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if err := sheets.UpdateClient(c.Request.Context(), client); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Unable to update client status."})
		return
	}
	c.JSON(http.StatusOK, client)
}

func bindClient(c *gin.Context) (sheets.Client, bool) {
	var client sheets.Client
	if err := c.ShouldBindJSON(&client); err != nil || strings.TrimSpace(client.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client name is required."})
		return sheets.Client{}, false
	}
	client.Name = strings.TrimSpace(client.Name)
	return client, true
}
