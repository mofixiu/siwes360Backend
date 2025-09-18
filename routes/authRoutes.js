const { Router } = require("express");
const router = Router();

const { apiLogin } = require("../controllers/userController");
const { storeUser} = require("../controllers/userController");
// const {  verifyEmail, resendOtp } = require("../controllers/userController");

// Public routes
router.post("/login", apiLogin);
router.post("/register", storeUser);
// router.post("/verify-email", verifyEmail);
// router.post("/resend-otp", resendOtp);

module.exports = router;
