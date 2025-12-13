const { get } = require("../app");
const Dailylog = require("../models/Dailylog");
const LogAttachment = require("../models/LogAttachment");
const fs = require('fs').promises;
const path = require('path');

const storeDailylog = async (req, res) => {
  try {
    console.log('\n=== Processing daily log ===');
    console.log('Body:', req.body);
    console.log('Files count:', req.files ? req.files.length : 0);
    
    const { student_id, log_date, description, skills_acquired, challenges_faced } = req.body;
    
    // Validate required fields
    if (!student_id || !log_date || !description) {
      console.error('Validation failed: Missing required fields');
      return res.status(400).json({
        status: "error",
        message: "Student ID, log date, and description are required",
      });
    }

    // Create the daily log entry
    const dailylog = Dailylog.fill({ 
      student_id: parseInt(student_id),
      log_date, 
      description,
      skills_acquired: skills_acquired || null,
      challenges_faced: challenges_faced || null,
      status: 'pending'
    });
    
    await dailylog.insert();
    console.log('Daily log created with ID:', dailylog.id);
    
    // Handle file uploads if any
    const attachments = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log(`Processing ${req.files.length} files`);
      
      const uploadDir = path.join(__dirname, '../uploads/logs');
      
      // Create uploads directory if it doesn't exist
      try {
        await fs.access(uploadDir);
      } catch {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log('Created uploads directory');
      }

      for (const file of req.files) {
        try {
          console.log('Processing file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          });
          
          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueFilename = `${timestamp}-${sanitizedName}`;
          const filePath = path.join(uploadDir, uniqueFilename);
          
          // Write file to disk
          await fs.writeFile(filePath, file.buffer);
          console.log('File saved:', uniqueFilename);
          
          // Save attachment record to database
          const attachment = LogAttachment.fill({
            log_id: dailylog.id,
            file_name: file.originalname,
            file_path: `/uploads/logs/${uniqueFilename}`,
            file_type: file.mimetype,
            file_size: file.size
          });
          
          await attachment.insert();
          attachments.push(attachment);
          console.log('Attachment record saved to database');
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          // Continue with other files
        }
      }
    } else {
      console.log('No files to process');
    }
    
    console.log('=== Daily log processing complete ===\n');
    
    res.json({
      status: "success",
      message: "Daily log created successfully",
      data: {
        log: dailylog,
        attachments: attachments
      },
    });
  } catch (error) {
    console.error('Error creating dailylog:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to create daily log: " + error.message,
    });
  }
};

const getDailylogs = async (req, res) => {
  try {
    const dailylogs = await Dailylog.fetch();
    res.json({
      status: "success",
      message: "Dailylogs fetched successfully",
      data: dailylogs,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dailylogs: " + error.message,
    });
  }
};

const getDailylogById = async (req, res) => {
  let { id } = req.params;
  
  try {
    const dailylog = await Dailylog.find(id);
    if (!dailylog) {
      return res.status(404).json({
        status: "error",
        message: "Dailylog not found",
      });
    }

    // Get attachments for this log
    const attachmentsSql = "SELECT * FROM log_attachments WHERE log_id = ?";
    const attachments = await LogAttachment.query(attachmentsSql, [id]);

    res.json({
      status: "success",
      message: "Dailylog fetched successfully",
      data: {
        log: dailylog,
        attachments: attachments
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dailylog: " + error.message,
    });
  }
};

const getDailylogsByStudent = async (req, res) => {
  let { student_id } = req.params;
  
  try {
    const sql = `
      SELECT 
        dl.*,
        (SELECT COUNT(*) FROM log_attachments WHERE log_id = dl.id) as attachment_count
      FROM daily_logs dl
      WHERE dl.student_id = ?
      ORDER BY dl.log_date DESC
    `;
    const dailylogs = await Dailylog.query(sql, [student_id]);
    
    res.json({
      status: "success",
      message: "Student dailylogs fetched successfully",
      data: dailylogs,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch student dailylogs: " + error.message,
    });
  }
};

const updateDailylog = async (req, res) => {
  let { id } = req.params;
  let { student_id, log_date, description, skills_acquired, challenges_faced, supervisor_comment, status } = req.body;
  
  try {
    const dailylog = await Dailylog.find(id);
    if (!dailylog) {
      return res.status(404).json({
        status: "error",
        message: "Dailylog not found",
      });
    }

    dailylog.fill({ 
      student_id, 
      log_date, 
      description, 
      skills_acquired,
      challenges_faced,
      supervisor_comment, 
      status 
    });
    await dailylog.update();

    res.json({
      status: "success",
      message: "Dailylog updated successfully",
      data: dailylog,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update dailylog: " + error.message,
    });
  }
};

const partialDailylogUpdate = async (req, res) => {
  let { id } = req.params;
  
  try {
    const dailylog = await Dailylog.find(id);
    if (!dailylog) {
      return res.status(404).json({
        status: "error",
        message: "Dailylog not found",
      });
    }
    
    dailylog.fill(req.body);
    await dailylog.update();

    res.json({
      status: "success",
      message: "Dailylog updated successfully",
      data: dailylog,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update dailylog: " + error.message,
    });
  }
};

const approveDailylog = async (req, res) => {
  let { id } = req.params;
  let { supervisor_comment } = req.body;
  
  try {
    const sql = "UPDATE daily_logs SET status = 'approved', supervisor_comment = ? WHERE id = ?";
    await Dailylog.query(sql, [supervisor_comment || null, id]);
    
    const dailylog = await Dailylog.find(id);
    
    res.json({
      status: "success",
      message: "Dailylog approved successfully",
      data: dailylog,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to approve dailylog: " + error.message,
    });
  }
};

const rejectDailylog = async (req, res) => {
  let { id } = req.params;
  let { supervisor_comment } = req.body;
  
  try {
    if (!supervisor_comment) {
      return res.status(400).json({
        status: "error",
        message: "Supervisor comment is required when rejecting a log",
      });
    }

    const sql = "UPDATE daily_logs SET status = 'rejected', supervisor_comment = ? WHERE id = ?";
    await Dailylog.query(sql, [supervisor_comment, id]);
    
    const dailylog = await Dailylog.find(id);
    
    res.json({
      status: "success",
      message: "Dailylog rejected successfully",
      data: dailylog,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to reject dailylog: " + error.message,
    });
  }
};

const deleteDailylog = async (req, res) => {
  let { id } = req.params;
  
  try {
    // Delete associated attachments first
    const attachmentsSql = "SELECT file_path FROM log_attachments WHERE log_id = ?";
    const attachments = await LogAttachment.query(attachmentsSql, [id]);
    
    // Delete physical files
    for (const attachment of attachments) {
      const filePath = path.join(__dirname, '..', attachment.file_path);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    // Delete attachment records
    const deleteAttachmentsSql = "DELETE FROM log_attachments WHERE log_id = ?";
    await LogAttachment.query(deleteAttachmentsSql, [id]);
    
    // Delete the log
    const deleted = await Dailylog.delete(id);
    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Failed to delete dailylog",
      });
    }

    res.json({
      status: "success",
      message: "Dailylog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete dailylog: " + error.message,
    });
  }
};


module.exports = {
  storeDailylog,
  getDailylogs,
  getDailylogById,
  getDailylogsByStudent,
  updateDailylog,
  partialDailylogUpdate,
  approveDailylog,
  rejectDailylog,
  deleteDailylog,
};
