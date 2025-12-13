const { Router } = require("express");
const router = Router();
const { login, register, getProfile } = require("../controllers/authController");
const verifyToken = require("../middlewares/verifyToken");

// Public routes
router.post("/login", login);
router.post("/register", register);

// Protected routes
router.get("/profile", verifyToken, getProfile);

module.exports = router;
