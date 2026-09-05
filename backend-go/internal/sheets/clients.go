package sheets

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const clientRange = "Clients!A:J"

type Client struct {
	ID        string `json:"id"`
	OwnerID   string `json:"ownerId"`
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Address   string `json:"address"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	Status    string `json:"status"`
	Row       int    `json:"-"`
}

func ListClients(ctx context.Context, ownerID string) ([]Client, error) {
	values, err := readValues(ctx, "Clients!A2:J")
	if err != nil {
		return nil, err
	}
	clients := make([]Client, 0, len(values))
	for index, row := range values {
		client := clientFromRow(row, index+2)
		if client.ID != "" && client.OwnerID == ownerID {
			clients = append(clients, client)
		}
	}
	return clients, nil
}

func GetClient(ctx context.Context, ownerID, id string) (Client, error) {
	clients, err := ListClients(ctx, ownerID)
	if err != nil {
		return Client{}, err
	}
	for _, client := range clients {
		if client.ID == id {
			return client, nil
		}
	}
	return Client{}, nil
}

func SaveClient(ctx context.Context, client Client) error {
	return writeValues(ctx, http.MethodPost, clientRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{clientToRow(client)})
}

func UpdateClient(ctx context.Context, client Client) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Clients!A%d:J%d?valueInputOption=RAW", client.Row, client.Row), [][]string{clientToRow(client)})
}

func NewClientID() string {
	value := make([]byte, 8)
	if _, err := rand.Read(value); err != nil {
		return "CL-" + fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "CL-" + hex.EncodeToString(value)
}

func clientFromRow(row []string, rowNumber int) Client {
	get := func(index int) string {
		if index < len(row) {
			return strings.TrimSpace(row[index])
		}
		return ""
	}
	return Client{
		ID:        get(0),
		OwnerID:   get(1),
		Name:      get(2),
		Phone:     get(3),
		Email:     get(4),
		Address:   get(5),
		Notes:     get(6),
		CreatedAt: get(7),
		UpdatedAt: get(8),
		Status:    get(9),
		Row:       rowNumber,
	}
}

func clientToRow(client Client) []string {
	return []string{client.ID, client.OwnerID, client.Name, client.Phone, client.Email, client.Address, client.Notes, client.CreatedAt, client.UpdatedAt, client.Status}
}
