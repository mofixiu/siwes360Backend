const User = require("../models/User");
require("dotenv").config();
const { hash, compare } = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "what is your name";
const storeUser = async (req, res) => {
  try {
    let { email, password, full_name, role, phone, ...roleSpecificData } = req.body;
    
    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        status: "error",
        message: "Email, password, full_name, and role are required",
      });
    }

    // Create the user first
    const user = User.fill({
      email,
      password,
      full_name,
      role,
      phone,
    });
    
    user.password = await hash(user.password, 10);
    await user.insert();
    
    // Now create role-specific record based on the role
    switch (role) {
      case 'student':
        const Student = require('../models/Student');
        const student = Student.fill({
          user_id: user.id,
          matric_no: roleSpecificData.matric_no,
          department: roleSpecificData.department,
          level: roleSpecificData.level,
          supervisor_id: roleSpecificData.supervisor_id,
          school_id: roleSpecificData.school_id,
        });
        await student.insert();
        break;
        
      case 'supervisor':
        const Supervisor = require('../models/Supervisor');
        const supervisor = Supervisor.fill({
          user_id: user.id,
          organization: roleSpecificData.organization,
          position: roleSpecificData.position,
        });
        await supervisor.insert();
        break;
        
      case 'itf':
        const Itf = require('../models/Itf');
        const itf = Itf.fill({
          user_id: user.id,
          region: roleSpecificData.region,
        });
        await itf.insert();
        break;
        
      case 'admin':
        const Admin = require('../models/Admin');
        const admin = Admin.fill({
          user_id: user.id,
          school_id: roleSpecificData.school_id,
        });
        await admin.insert();
        break;
    }
    
    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
    };
    
    res.json({
      status: "success",
      message: "User and profile created successfully",
      data: userData,
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }
    
    res.status(500).json({
      status: "error",
      message: "Failed to create user: " + error.message,
    });
  }
};

const getUsers = async (req, res) => {
  const users = await User.fetch();
  res.json({
    status: "success",
    message: "Users fetched successfully",
    data: users,
  });
};

const getUserById = async (req, res) => {
  let { id } = req.params;
  const user = await User.find(id);
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }
  res.json({
    status: "success",
    message: "User fetched successfully",
    data: user,
  });
};

const updateUser = async (req, res) => {
  let { id } = req.params;
  let {
      email,
    password,
    full_name,
    role,
    phone,
  } = req.body;
  const user = await User.find(id);
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }
  user.fill({
    email,
    password,
    full_name,
    role,
    phone,
  });

  await user.update();

  res.json({
    status: "success",
    message: "User updated successfully",
    data: user,
  });
};

const partialUserUpdate = async (req, res) => {
  let { id } = req.params;
  const user = await User.find(id);
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }
  user.fill(req.body);

  await user.update();

  res.json({
    status: "success",
    message: "User updated successfully",
    data: user,
  });
};

const deleteUser = async (req, res) => {
  let { id } = req.params;
  const deleted = await User.delete(id);
  if (!deleted) {
    return res.status(404).json({
      status: "error",
      message: "Failed to delete user",
    });
  }

  res.json({
    status: "success",
    message: "User deleted successfully",
  });
};

const apiLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Check if the user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Check if the password is correct
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Generate a token with user object - Fixed the property names
    const token = jwt.sign(
      {
        user: {
          id: user.id,           // Changed from user.user_id
          email: user.email,     // Changed from user.username
          full_name: user.full_name,  // Added full_name
          role: user.role,
        },
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return both token and user data
    res.json({
      status: "success",
      message: "Login successful",
      data: { 
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          phone: user.phone
        }
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: "error",
      message: "Internal server error during login",
    });
  }
};

module.exports = {
  storeUser,
  getUsers,
  getUserById,
  updateUser,
  partialUserUpdate,
  deleteUser,
  apiLogin,
};
