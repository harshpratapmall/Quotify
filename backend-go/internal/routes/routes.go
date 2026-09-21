package routes

import (
	"backend-go/internal/handlers"
	"backend-go/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.Use(middleware.CORS())
	router.Use(middleware.APILogger())
	router.Use(middleware.AuthMiddleware())
	router.Use(middleware.PostHog())

	router.GET("/ping", handlers.Ping)

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
		v1.GET("/auth/logo-upload-token", handlers.LogoUploadAuthorization)
		v1.POST("/auth/logo-upload-token/verify", handlers.VerifyLogoUploadAuthorization)
		v1.GET("/public/share/:token", handlers.GetPublicShare)
		v1.GET("/clients", handlers.ListClients)
		v1.POST("/clients", handlers.CreateClient)
		v1.GET("/clients/:id", handlers.GetClient)
		v1.GET("/clients/:id/documents", handlers.GetClientDocuments)
		v1.PUT("/clients/:id", handlers.UpdateClient)
		v1.PATCH("/clients/:id/status", handlers.UpdateClientStatus)
		v1.DELETE("/clients/:id", handlers.DeleteClient)
		v1.GET("/employees", handlers.ListEmployees)
		v1.POST("/employees", handlers.CreateEmployee)
		v1.GET("/employees/:id", handlers.GetEmployee)
		v1.PUT("/employees/:id", handlers.UpdateEmployee)
		v1.DELETE("/employees/:id", handlers.DeleteEmployee)
		v1.GET("/employees/payroll", handlers.EmployeePayrollOverview)
		v1.GET("/employees/payroll/register", handlers.EmployeePayrollRegister)
		v1.GET("/employees/payroll/export", handlers.EmployeePayrollExport)
		v1.GET("/employees/:id/payroll", handlers.GetEmployeePayroll)
		v1.POST("/employees/:id/payroll", handlers.SaveEmployeePayroll)
		v1.POST("/employees/:id/payroll/entries", handlers.CreateEmployeePayrollEntry)
		v1.PUT("/employees/:id/payroll/entries/:entryId", handlers.UpdateEmployeePayrollEntry)
		v1.DELETE("/employees/:id/payroll/entries/:entryId", handlers.DeleteEmployeePayrollEntry)
		v1.POST("/employees/:id/payroll/:period/finalize", func(c *gin.Context) { handlers.SetEmployeePayrollFinalization(c, true) })
		v1.POST("/employees/:id/payroll/:period/reopen", func(c *gin.Context) { handlers.SetEmployeePayrollFinalization(c, false) })
		v1.GET("/employees/:id/payroll/:period/payslip", handlers.GetEmployeePayslip)
		v1.GET("/business-profile", handlers.BusinessProfile)
		v1.PUT("/business-profile", handlers.SaveBusinessProfile)
		v1.GET("/quotations", handlers.ListQuotations)
		v1.POST("/quotations", handlers.CreateQuotation)
		v1.GET("/quotations/:id", handlers.GetQuotation)
		v1.PUT("/quotations/:id", handlers.UpdateQuotation)
		v1.DELETE("/quotations/:id", handlers.DeleteQuotation)
		v1.PATCH("/quotations/:id/status", handlers.UpdateQuotationStatus)
		v1.POST("/quotations/:id/share", handlers.CreateQuotationShare)
		v1.DELETE("/quotations/:id/share", handlers.RevokeQuotationShare)
		v1.POST("/quotations/:id/convert-to-bill", handlers.ConvertQuotationToBill)
		v1.GET("/bills", handlers.ListBills)
		v1.POST("/bills", handlers.CreateBill)
		v1.GET("/bills/:id", handlers.GetBill)
		v1.PUT("/bills/:id", handlers.UpdateBill)
		v1.DELETE("/bills/:id", handlers.DeleteBill)
		v1.PATCH("/bills/:id/status", handlers.UpdateBillStatus)
		v1.POST("/bills/:id/share", handlers.CreateBillShare)
		v1.DELETE("/bills/:id/share", handlers.RevokeBillShare)

		admin := v1.Group("/admin")
		admin.Use(handlers.RequireAdmin)
		admin.GET("/users", handlers.ListUsers)
		admin.POST("/users", handlers.CreateUser)
		admin.PATCH("/users/:id/status", handlers.UpdateUserStatus)
		admin.POST("/users/:id/reset-password", handlers.ResetUserPassword)
	}
	return router
}
