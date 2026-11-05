const { Router } = require("express");
const router = Router();
const {
  login,
  register,
  getProfile,
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/authController");
const verifyToken = require("../middlewares/verifyToken");

// Public routes
router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", verifyToken, getProfile);
router.post("/change-password", verifyToken, changePassword);

module.exports = router;
