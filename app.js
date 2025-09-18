const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
const { resolve } = require('path');
const fileUpload = require('express-fileupload');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

// 🔑 Middlewares
const verifyToken = require('./middlewares/verifyToken');

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const studentRoutes = require("./routes/studentRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const logRoutes = require("./routes/logRoutes");
const gradeRoutes = require("./routes/gradeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    useTempFiles: true,
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
}));

app.use(session({
    secret: process.env.SESSION_SECRET || "what is your name",
    resave: false,
    saveUninitialized: true,
}));
app.use(flash());
app.use(methodOverride('_method'));

app.use(express.static(resolve('assets')));
app.use(express.static(resolve('uploads')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', req.body);
    }
    if (req.files && Object.keys(req.files).length > 0) {
        console.log('Files:', Object.keys(req.files));
    }
    next();
});

// =======================
// 🚪 Public Routes
// =======================
app.use("/api/auth", authRoutes);

// =======================
// 🔐 Protected Routes (token required)
// =======================
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/students", verifyToken, studentRoutes);
app.use("/api/supervisors", verifyToken, supervisorRoutes);
app.use("/api/logs", verifyToken, logRoutes);
app.use("/api/grades", verifyToken, gradeRoutes);
app.use("/api/notifications", verifyToken, notificationRoutes);

// Health check endpoints
app.get('/test', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        route: '/test (root)'
    });
});

app.get('/health/db', async (req, res) => {
    try {
        const connection = require('./models/Connection');
        const testConnection = await connection.getConnection();
        testConnection.release();
        res.json({ 
            status: 'success', 
            message: 'Database connection is healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 404 handler - Fixed: removed the problematic '*' pattern
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        method: req.method,
        path: req.originalUrl,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
});

module.exports = app;
