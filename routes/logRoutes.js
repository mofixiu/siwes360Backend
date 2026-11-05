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
  storeDailyLog,
  getDailylogs,
  getDailylogById,
  getDailylogsByStudent,
  updateDailylog,
  partialDailylogUpdate,
  approveDailyLog,
  rejectDailyLog,
  deleteDailylog,
} = require("../controllers/dailylogController.js");
const allowRoles = require("../middlewares/allowRoles");
const {
  studentViewer,
  loadDailyLog,
  dailyLogViewer,
  dailyLogAuthor,
  dailyLogSupervisor,
} = require("../middlewares/access");

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

// Mounted behind verifyToken in app.js.

// Students write their own logs; the controller takes student_id from the token.
router.post(
  "/",
  allowRoles("student"),
  upload.array('attachments', 5),
  handleMulterError,
  storeDailyLog
);

router.get("/", allowRoles("admin", "itf"), getDailylogs);
router.get("/student/:student_id", studentViewer("student_id"), getDailylogsByStudent);
router.get("/:id", loadDailyLog, dailyLogViewer, getDailylogById);
router.put("/:id", loadDailyLog, dailyLogAuthor, updateDailylog);
router.patch("/:id", loadDailyLog, dailyLogAuthor, partialDailylogUpdate);

// Only the student's own supervisor reviews a log.
router.put("/:id/approve", loadDailyLog, dailyLogSupervisor, approveDailyLog);
router.put("/:id/reject", loadDailyLog, dailyLogSupervisor, rejectDailyLog);

router.delete("/:id", loadDailyLog, dailyLogAuthor, deleteDailylog);

module.exports = router;
