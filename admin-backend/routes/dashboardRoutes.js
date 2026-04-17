const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { protectAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protectAdmin, dashboardController.getDashboard);
router.get("/requests", protectAdmin, dashboardController.getPendingRequests);
router.get("/users", protectAdmin, dashboardController.getUsersList);
router.patch("/requests/:id", protectAdmin, dashboardController.updateRequestStatus);
router.post("/rate", protectAdmin, dashboardController.updateMetalRate);
router.get("/active-chits", protectAdmin, dashboardController.getActiveChits);
router.post("/manual/user", protectAdmin, dashboardController.manualCreateUser);
router.post("/manual/chit", protectAdmin, dashboardController.manualAssignChit);
router.post("/manual/payment", protectAdmin, dashboardController.manualAddPayment);
router.get("/payments", protectAdmin, dashboardController.getPaymentHistory);
router.get("/debug/orders", protectAdmin, dashboardController.debugOrders);

// UPI Management
router.get("/upi", protectAdmin, dashboardController.getUPIs);
router.post("/upi", protectAdmin, dashboardController.addUPI);
router.patch("/upi/:id/active", protectAdmin, dashboardController.setActiveUPI);
router.delete("/upi/:id", protectAdmin, dashboardController.deleteUPI);

// Public UPI fetch for customer app
router.get("/upi/active", dashboardController.getActiveUPIPublic);

module.exports = router;
