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

const employeeRange = "Employee!A:K"

type Employee struct {
	ID          string `json:"id"`
	OwnerID     string `json:"ownerId"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	Designation string `json:"designation"`
	Notes       string `json:"notes"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	Row         int    `json:"-"`
}

func ListEmployees(ctx context.Context, ownerID string) ([]Employee, error) {
	values, err := readValues(ctx, "Employee!A2:K")
	if err != nil {
		return nil, err
	}
	employees := make([]Employee, 0, len(values))
	for index, row := range values {
		employee := employeeFromRow(row, index+2)
		if employee.ID != "" && employee.OwnerID == ownerID {
			employees = append(employees, employee)
		}
	}
	return employees, nil
}

func GetEmployee(ctx context.Context, ownerID, id string) (Employee, error) {
	employees, err := ListEmployees(ctx, ownerID)
	if err != nil {
		return Employee{}, err
	}
	for _, employee := range employees {
		if employee.ID == id {
			return employee, nil
		}
	}
	return Employee{}, nil
}

func SaveEmployee(ctx context.Context, employee Employee) error {
	return writeValues(ctx, http.MethodPost, employeeRange+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", [][]string{employeeToRow(employee)})
}

func UpdateEmployee(ctx context.Context, employee Employee) error {
	return writeValues(ctx, http.MethodPut, fmt.Sprintf("Employee!A%d:K%d?valueInputOption=RAW", employee.Row, employee.Row), [][]string{employeeToRow(employee)})
}

func DeleteEmployee(ctx context.Context, row int) error {
	return deleteDocumentRow(ctx, row, "Employee")
}

func NewEmployeeID() string {
	value := make([]byte, 8)
	if _, err := rand.Read(value); err != nil {
		return "EM-" + fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "EM-" + hex.EncodeToString(value)
}

func employeeFromRow(row []string, rowNumber int) Employee {
	get := func(index int) string {
		if index < len(row) {
			return strings.TrimSpace(row[index])
		}
		return ""
	}
	return Employee{
		ID:          get(0),
		OwnerID:     get(1),
		Name:        get(2),
		Phone:       get(3),
		Email:       get(4),
		Address:     get(5),
		Designation: get(6),
		Notes:       get(7),
		Status:      get(8),
		CreatedAt:   get(9),
		UpdatedAt:   get(10),
		Row:         rowNumber,
	}
}

func employeeToRow(employee Employee) []string {
	return []string{employee.ID, employee.OwnerID, employee.Name, employee.Phone, employee.Email, employee.Address, employee.Designation, employee.Notes, employee.Status, employee.CreatedAt, employee.UpdatedAt}
}
