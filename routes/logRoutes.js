const { Router } = require("express");
const router = Router();
const multer = require('multer');

// Configure multer with more lenient settings
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
    fieldSize: 10 * 1024 * 1024, // 10MB field size
  },
  fileFilter: (req, file, cb) => {
    console.log('Received file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('Rejected file type:', file.mimetype);
      cb(null, false); // Don't reject, just skip
    }
  }
});

const { 
  storeDailylog, 
  getDailylogs, 
  getDailylogById, 
  getDailylogsByStudent,
  updateDailylog,
  partialDailylogUpdate,
  approveDailylog,
  rejectDailylog,
  deleteDailylog 
} = require("../controllers/dailylogController.js");
const verifyToken = require("../middlewares/verifyToken");

// Custom error handler for multer
const handleMulterError = (err, req, res, next) => {
  console.error('Multer middleware error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'error',
      message: `File upload error: ${err.message}`,
      error: err.code,
    });
  } else if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload failed',
    });
  }
  next();
};

// Student logs with better error handling
router.post(
  "/", 
  verifyToken,
  (req, res, next) => {
    console.log('\n=== New log upload request ===');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
  upload.array('attachments', 5),
  handleMulterError,
  storeDailylog
);

router.get("/", getDailylogs);
router.get("/:id", getDailylogById);
router.get("/student/:student_id", getDailylogsByStudent);
router.put("/:id", verifyToken, updateDailylog);
router.patch("/:id", verifyToken, partialDailylogUpdate);

// Supervisor actions
router.put("/:id/approve", verifyToken, approveDailylog);
router.put("/:id/reject", verifyToken, rejectDailylog);

// Delete
router.delete("/:id", verifyToken, deleteDailylog);

module.exports = router;
