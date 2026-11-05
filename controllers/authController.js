const User = require("../models/User");
const Student = require("../models/Student");
const Supervisor = require("../models/Supervisor");
const Admin = require("../models/Admin");
const Itf = require("../models/Itf");
const crypto = require("crypto");
const { hash, compare } = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_ALGORITHM, PASSWORD_MIN_LENGTH, BCRYPT_ROUNDS } = require("../config/auth");
const mailer = require("../utils/mailer");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Find user by email using the existing findByEmail method
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Verify password (accounts created without one cannot sign in)
    const isPasswordValid = Boolean(user.password) && (await compare(String(password), user.password));
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Get role-specific data
    let roleData = null;
    switch (user.role) {
      case 'student':
        const studentSql = "SELECT * FROM students WHERE user_id = ?";
        const studentRows = await Student.query(studentSql, [user.id]);
        roleData = studentRows[0] || null;
        break;
        
      case 'supervisor':
        const supervisorSql = "SELECT * FROM supervisors WHERE user_id = ?";
        const supervisorRows = await Supervisor.query(supervisorSql, [user.id]);
        roleData = supervisorRows[0] || null;
        break;
        
      case 'admin':
        const adminSql = "SELECT * FROM admins WHERE user_id = ?";
        const adminRows = await Admin.query(adminSql, [user.id]);
        roleData = adminRows[0] || null;
        break;
        
      case 'itf':
        const itfSql = "SELECT * FROM itf WHERE user_id = ?";
        const itfRows = await Itf.query(itfSql, [user.id]);
        roleData = itfRows[0] || null;
        break;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }
    );

    // Remove password from response
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user: userResponse,
        role_data: roleData,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: "error",
      message: "Login failed: " + error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    let { email, password, full_name, role, phone, ...roleSpecificData } = req.body;
    
    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        status: "error",
        message: "Email, password, full_name, and role are required",
      });
    }

    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        status: "error",
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      });
    }

    // Only allow supervisor registration through public endpoint
    if (role !== 'supervisor') {
      return res.status(403).json({
        status: "error",
        message: "Only supervisors can register through this endpoint. Students are registered by their schools.",
      });
    }

    // Validate role-specific fields for supervisor
    if (!roleSpecificData.organization || !roleSpecificData.position) {
      return res.status(400).json({
        status: "error",
        message: "Organization and position are required for supervisor registration",
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    // Create the user first
    const user = User.fill({
      email,
      password: await hash(String(password), BCRYPT_ROUNDS),
      full_name,
      role,
      phone,
    });
    
    await user.insert();
    
    // Create supervisor record
    const supervisor = Supervisor.fill({
      user_id: user.id,
      organization: roleSpecificData.organization,
      position: roleSpecificData.position,
    });
    await supervisor.insert();

    res.status(201).json({
      status: "success",
      message: "Supervisor registered successfully. Please login to continue.",
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: "error",
      message: "Registration failed: " + error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token
    
    const user = await User.find(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Get role-specific data
    let roleData = null;
    switch (user.role) {
      case 'student':
        const studentSql = "SELECT * FROM students WHERE user_id = ?";
        const studentRows = await Student.query(studentSql, [userId]);
        roleData = studentRows[0] || null;
        break;
        
      case 'supervisor':
        const supervisorSql = "SELECT * FROM supervisors WHERE user_id = ?";
        const supervisorRows = await Supervisor.query(supervisorSql, [userId]);
        roleData = supervisorRows[0] || null;
        break;
        
      case 'admin':
        const adminSql = "SELECT * FROM admins WHERE user_id = ?";
        const adminRows = await Admin.query(adminSql, [userId]);
        roleData = adminRows[0] || null;
        break;
        
      case 'itf':
        const itfSql = "SELECT * FROM itf WHERE user_id = ?";
        const itfRows = await Itf.query(itfSql, [userId]);
        roleData = itfRows[0] || null;
        break;
    }

    // Remove password from response
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({
      status: "success",
      data: {
        user: userResponse,
        role_data: roleData,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch profile: " + error.message,
    });
  }
};

const passwordProblem = (password) => {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  return null;
};

// POST /api/auth/change-password  { current_password, new_password }
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        status: "error",
        message: "current_password and new_password are required",
      });
    }
    const problem = passwordProblem(new_password);
    if (problem) {
      return res.status(400).json({ status: "error", message: problem });
    }
    if (current_password === new_password) {
      return res.status(400).json({
        status: "error",
        message: "New password must be different from the current one",
      });
    }

    const rows = await User.query("SELECT password FROM users WHERE id = ?", [req.user.id]);
    const currentHash = rows[0] && rows[0].password;
    if (!currentHash || !(await compare(String(current_password), currentHash))) {
      return res.status(400).json({ status: "error", message: "Current password is incorrect" });
    }

    await User.query("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [
      await hash(new_password, BCRYPT_ROUNDS),
      req.user.id,
    ]);
    // A reset that was in progress is no longer needed. The table may not
    // exist yet if database/002_password_resets.sql hasn't been run.
    await User.query("DELETE FROM password_resets WHERE user_id = ?", [req.user.id]).catch((e) => {
      if (e.code !== "ER_NO_SUCH_TABLE") throw e;
    });

    res.json({ status: "success", message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ status: "error", message: "Failed to change password" });
  }
};

// ---- Password reset by emailed code -------------------------------------
// 1. POST /forgot-password   { email }                       -> emails a 6-digit code
// 2. POST /verify-reset-otp  { email, otp }                  -> { reset_token }
// 3. POST /reset-password    { reset_token, new_password }   -> password changed
// Codes and tokens are stored only as hashes in `password_resets`
// (database/002_password_resets.sql). Codes last 10 minutes and allow 5 tries;
// reset tokens last 15 minutes and work once.
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

// Answer for the reset endpoints when the password_resets table is missing.
const resetTableMissing = (error, res) => {
  if (error.code !== "ER_NO_SUCH_TABLE") return false;
  console.error("password_resets table is missing: run database/002_password_resets.sql");
  res.status(503).json({
    status: "error",
    message: "Password reset is not set up on this server yet. Ask your school admin to reset your password.",
  });
  return true;
};

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const GENERIC_FORGOT_MESSAGE =
  "If an account exists for that email, a 6-digit reset code has been sent to it.";

const forgotPassword = async (req, res) => {
  try {
    if (!mailer.isConfigured()) {
      return res.status(503).json({
        status: "error",
        message: "Password reset by email is not set up on this server yet. Ask your school admin to reset your password.",
      });
    }

    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email is required" });
    }

    const users = await User.query("SELECT id, email, full_name FROM users WHERE email = ?", [email]);
    // Same answer whether or not the account exists, so the endpoint can't be
    // used to find out who has an account.
    if (users.length === 0) {
      return res.json({ status: "success", message: GENERIC_FORGOT_MESSAGE });
    }
    const user = users[0];

    const recent = await User.query(
      "SELECT 1 FROM password_resets WHERE user_id = ? AND created_at > NOW() - INTERVAL ? SECOND",
      [user.id, RESEND_COOLDOWN_SECONDS]
    );
    if (recent.length > 0) {
      return res.json({ status: "success", message: GENERIC_FORGOT_MESSAGE });
    }

    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    await User.query(
      `REPLACE INTO password_resets (user_id, otp_hash, otp_expires_at, attempts, created_at)
       VALUES (?, ?, NOW() + INTERVAL ? MINUTE, 0, NOW())`,
      [user.id, await hash(otp, BCRYPT_ROUNDS), OTP_TTL_MINUTES]
    );

    try {
      await mailer.sendMail({
        to: user.email,
        subject: "Your SIWES360 password reset code",
        text:
          `Hello ${user.full_name || ""},\n\n` +
          `Your SIWES360 password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.\n\n` +
          "If you didn't ask to reset your password, you can ignore this email.",
      });
    } catch (mailError) {
      console.error("Reset email failed:", mailError.message);
      await User.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
      return res.status(502).json({
        status: "error",
        message: "We couldn't send the reset email. Please try again later.",
      });
    }

    res.json({ status: "success", message: GENERIC_FORGOT_MESSAGE });
  } catch (error) {
    if (resetTableMissing(error, res)) return;
    console.error("Forgot password error:", error);
    res.status(500).json({ status: "error", message: "Failed to process password reset request" });
  }
};

const verifyResetOTP = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : String(req.body.otp ?? "");
    const invalid = () =>
      res.status(400).json({ status: "error", message: "Invalid or expired code. Request a new one." });

    if (!email || !/^\d{6}$/.test(otp)) return invalid();

    const rows = await User.query(
      `SELECT pr.user_id, pr.otp_hash, pr.attempts
         FROM password_resets pr
         JOIN users u ON u.id = pr.user_id
        WHERE u.email = ? AND pr.otp_expires_at > NOW()`,
      [email]
    );
    if (rows.length === 0) return invalid();
    const reset = rows[0];

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      await User.query("DELETE FROM password_resets WHERE user_id = ?", [reset.user_id]);
      return invalid();
    }

    if (!(await compare(otp, reset.otp_hash))) {
      await User.query("UPDATE password_resets SET attempts = attempts + 1 WHERE user_id = ?", [reset.user_id]);
      return invalid();
    }

    // The code is spent; hand out a single-use token for the next step.
    const resetToken = crypto.randomBytes(32).toString("hex");
    await User.query(
      `UPDATE password_resets
          SET otp_expires_at = NOW(), reset_token_hash = ?, reset_token_expires_at = NOW() + INTERVAL ? MINUTE
        WHERE user_id = ?`,
      [sha256(resetToken), RESET_TOKEN_TTL_MINUTES, reset.user_id]
    );

    res.json({
      status: "success",
      message: "Code verified",
      data: { reset_token: resetToken, email },
    });
  } catch (error) {
    if (resetTableMissing(error, res)) return;
    console.error("Verify OTP error:", error);
    res.status(500).json({ status: "error", message: "Failed to verify code" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;

    const problem = passwordProblem(new_password);
    if (problem) {
      return res.status(400).json({ status: "error", message: problem });
    }
    if (typeof reset_token !== "string" || !reset_token) {
      return res.status(400).json({ status: "error", message: "Invalid or expired reset token" });
    }

    const rows = await User.query(
      "SELECT user_id FROM password_resets WHERE reset_token_hash = ? AND reset_token_expires_at > NOW()",
      [sha256(reset_token)]
    );
    if (rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token. Please request a new code.",
      });
    }
    const userId = rows[0].user_id;

    await User.query("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [
      await hash(new_password, BCRYPT_ROUNDS),
      userId,
    ]);
    await User.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);

    res.json({
      status: "success",
      message: "Password has been reset. You can now log in with your new password.",
    });
  } catch (error) {
    if (resetTableMissing(error, res)) return;
    console.error("Reset password error:", error);
    res.status(500).json({ status: "error", message: "Failed to reset password" });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};