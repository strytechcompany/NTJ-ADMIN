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

module.exports = router;
