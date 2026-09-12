package handlers

import (
	"net/http"
	"strings"
	"time"

	"backend-go/internal/sheets"

	"github.com/gin-gonic/gin"
)

func ListEmployees(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	employees, err := sheets.ListEmployees(c.Request.Context(), ownerID)
	if err != nil {
		unavailable(c, "Unable to load employees.")
		return
	}
	query := strings.TrimSpace(strings.ToLower(c.Query("q")))
	if query != "" {
		filtered := employees[:0]
		for _, employee := range employees {
			if strings.Contains(strings.ToLower(employee.Name), query) || strings.Contains(strings.ToLower(employee.Phone), query) || strings.Contains(strings.ToLower(employee.Email), query) {
				filtered = append(filtered, employee)
			}
		}
		employees = filtered
	}
	c.JSON(http.StatusOK, employees)
}

func GetEmployee(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	employee, err := sheets.GetEmployee(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load employee.")
		return
	}
	if employee.ID == "" {
		notFound(c, "Employee not found.")
		return
	}
	c.JSON(http.StatusOK, employee)
}

func CreateEmployee(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	employee, ok := bindEmployee(c)
	if !ok {
		return
	}
	if strings.TrimSpace(employee.Status) == "" {
		employee.Status = "active"
	}
	if !validEmployeeStatus(employee.Status) {
		badRequest(c, "Employee status must be active or inactive.")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	employee.ID = sheets.NewEmployeeID()
	employee.OwnerID = ownerID
	employee.CreatedAt = now
	employee.UpdatedAt = now
	if err := sheets.SaveEmployee(c.Request.Context(), employee); err != nil {
		unavailable(c, "Unable to save employee.")
		return
	}
	c.JSON(http.StatusCreated, employee)
}

func UpdateEmployee(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	existing, err := sheets.GetEmployee(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load employee.")
		return
	}
	if existing.ID == "" {
		notFound(c, "Employee not found.")
		return
	}
	employee, ok := bindEmployee(c)
	if !ok {
		return
	}
	if strings.TrimSpace(employee.Status) == "" {
		employee.Status = existing.Status
	}
	if !validEmployeeStatus(employee.Status) {
		badRequest(c, "Employee status must be active or inactive.")
		return
	}
	employee.ID = existing.ID
	employee.OwnerID = ownerID
	employee.CreatedAt = existing.CreatedAt
	employee.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	employee.Row = existing.Row
	if err := sheets.UpdateEmployee(c.Request.Context(), employee); err != nil {
		unavailable(c, "Unable to update employee.")
		return
	}
	c.JSON(http.StatusOK, employee)
}

func DeleteEmployee(c *gin.Context) {
	ownerID, ok := quotationOwner(c)
	if !ok {
		unauthorized(c)
		return
	}
	employee, err := sheets.GetEmployee(c.Request.Context(), ownerID, c.Param("id"))
	if err != nil {
		unavailable(c, "Unable to load employee.")
		return
	}
	if employee.ID == "" {
		notFound(c, "Employee not found.")
		return
	}
	if err := sheets.DeleteEmployee(c.Request.Context(), employee.Row); err != nil {
		unavailable(c, "Unable to delete employee.")
		return
	}
	c.Status(http.StatusNoContent)
}

func validEmployeeStatus(status string) bool {
	status = strings.TrimSpace(strings.ToLower(status))
	return status == "active" || status == "inactive"
}

func bindEmployee(c *gin.Context) (sheets.Employee, bool) {
	var employee sheets.Employee
	if err := c.ShouldBindJSON(&employee); err != nil || strings.TrimSpace(employee.Name) == "" {
		badRequest(c, "Employee name is required.")
		return sheets.Employee{}, false
	}
	employee.Name = strings.TrimSpace(employee.Name)
	return employee, true
}
