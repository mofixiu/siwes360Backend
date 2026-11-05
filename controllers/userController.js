const User = require("../models/User");
const { hash } = require("bcrypt");
const { PUBLIC_USER_SELECT, publicUser, pick } = require("../utils/sanitize");
const { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH } = require("../config/auth");

const ROLES = ["student", "supervisor", "admin", "itf"];

// Fields a user (or an admin on their behalf) may change through /api/users.
// Role and password are deliberately absent: passwords go through
// /api/auth/change-password, and roles are not changeable through the API.
const UPDATABLE_USER_FIELDS = ["full_name", "email", "phone"];

// Admin only (see routes/userRoutes.js).
const storeUser = async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        status: "error",
        message: "Email, password, full_name, and role are required",
      });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ status: "error", message: "Unknown role" });
    }
    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        status: "error",
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      });
    }

    const user = User.fill({
      email,
      password: await hash(String(password), BCRYPT_ROUNDS),
      full_name,
      role,
      phone,
    });
    await user.insert();

    switch (role) {
      case "student": {
        const Student = require("../models/Student");
        const fields = pick(req.body, ["matric_no", "department", "level", "supervisor_id", "school_id"]);
        await Student.fill({ user_id: user.id, ...fields }).insert();
        break;
      }
      case "supervisor": {
        const Supervisor = require("../models/Supervisor");
        const fields = pick(req.body, ["organization", "position"]);
        await Supervisor.fill({ user_id: user.id, ...fields }).insert();
        break;
      }
      case "itf": {
        const Itf = require("../models/Itf");
        const fields = pick(req.body, ["region"]);
        await Itf.fill({ user_id: user.id, ...fields }).insert();
        break;
      }
      case "admin": {
        const Admin = require("../models/Admin");
        const fields = pick(req.body, ["school_id"]);
        await Admin.fill({ user_id: user.id, ...fields }).insert();
        break;
      }
    }

    res.json({
      status: "success",
      message: "User and profile created successfully",
      data: publicUser(user),
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ status: "error", message: "Email already exists" });
    }

    res.status(500).json({ status: "error", message: "Failed to create user" });
  }
};

// Admin only.
const getUsers = async (req, res) => {
  const users = await User.query(`SELECT ${PUBLIC_USER_SELECT} FROM users ORDER BY id`);
  res.json({
    status: "success",
    message: "Users fetched successfully",
    data: users,
  });
};

// Self or admin.
const getUserById = async (req, res) => {
  const rows = await User.query(`SELECT ${PUBLIC_USER_SELECT} FROM users WHERE id = ?`, [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }
  res.json({
    status: "success",
    message: "User fetched successfully",
    data: rows[0],
  });
};

// Shared by PUT and PATCH: only UPDATABLE_USER_FIELDS are written, every other
// key in the body is ignored.
const applyUserUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = pick(req.body, UPDATABLE_USER_FIELDS);

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        status: "error",
        message: `Nothing to update. Allowed fields: ${UPDATABLE_USER_FIELDS.join(", ")}`,
      });
    }
    if ("full_name" in fields && !String(fields.full_name).trim()) {
      return res.status(400).json({ status: "error", message: "full_name cannot be empty" });
    }
    if ("email" in fields && !String(fields.email).trim()) {
      return res.status(400).json({ status: "error", message: "email cannot be empty" });
    }

    const setClause = Object.keys(fields).map((key) => `${key} = ?`).join(", ");
    const result = await User.query(`UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`, [
      ...Object.values(fields),
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const rows = await User.query(`SELECT ${PUBLIC_USER_SELECT} FROM users WHERE id = ?`, [id]);
    res.json({
      status: "success",
      message: "User updated successfully",
      data: rows[0],
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ status: "error", message: "Email already exists" });
    }
    console.error("Update user error:", error);
    res.status(500).json({ status: "error", message: "Failed to update user" });
  }
};

const updateUser = applyUserUpdate;
const partialUserUpdate = applyUserUpdate;

// Admin only.
const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ status: "error", message: "You cannot delete your own account" });
  }
  const result = await User.query("DELETE FROM users WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }

  res.json({
    status: "success",
    message: "User deleted successfully",
  });
};

module.exports = {
  storeUser,
  getUsers,
  getUserById,
  updateUser,
  partialUserUpdate,
  deleteUser,
  UPDATABLE_USER_FIELDS,
};
