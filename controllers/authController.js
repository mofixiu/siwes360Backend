const User = require("../models/User");
const Student = require("../models/Student");
const Supervisor = require("../models/Supervisor");
const Admin = require("../models/Admin");
const Itf = require("../models/Itf");
const { hash, compare } = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "what is your name";

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

    // Verify password
    const isPasswordValid = await compare(password, user.password);
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
      { expiresIn: '7d' }
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
      password: await hash(password, 10),
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

module.exports = {
  login,
  register,
  getProfile,
};