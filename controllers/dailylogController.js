const Dailylog = require("../models/Dailylog");
const LogAttachment = require("../models/LogAttachment");
const fs = require('fs').promises;
const path = require('path');
const { createNotification } = require('./notificationController');
const { pick } = require('../utils/sanitize');

const storeDailyLog = async (req, res) => {
    try {
        console.log('=== Store Daily Log Request ===');
        console.log('Body:', req.body);
        console.log('Files:', req.files?.length || 0);
        
        // The author is always the signed-in student; student_id in the body is ignored.
        const student_id = req.user.id;
        let {
            log_date,
            description,
            skills_acquired,
            challenges_faced,
        } = req.body;

        // Ensure date is in correct format (YYYY-MM-DD) without timezone conversion
        // MySQL DATE type stores dates without timezone
        if (log_date && log_date.includes('T')) {
            // If date includes time, extract only the date part
            log_date = log_date.split('T')[0];
        }
        
        console.log('Processed log_date:', log_date);

        const dailyLog = Dailylog.fill({
            student_id,
            log_date,
            description,
            skills_acquired,
            challenges_faced,
            status: "pending",
        });

        await dailyLog.insert();
        console.log('Daily log inserted with ID:', dailyLog.id);

        // Handle file attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
          console.log(`Processing ${req.files.length} files...`);
          
          // Create uploads directory if it doesn't exist
          const uploadDir = path.join(__dirname, '..', 'uploads', 'logs');
          await fs.mkdir(uploadDir, { recursive: true });
          
          for (const file of req.files) {
            try {
              console.log('Processing file:', file.originalname);
              const timestamp = Date.now();
              const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
              const uniqueFilename = `${timestamp}-${sanitizedName}`;
              const filePath = path.join(uploadDir, uniqueFilename);
              
              // Write file to disk
              await fs.writeFile(filePath, file.buffer);
              console.log('File saved:', uniqueFilename);
              
              // Save attachment record to database
              const attachment = LogAttachment.fill({
                log_id: dailyLog.id,
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

        // Get student and supervisor info for notification
        const studentSql = `
            SELECT 
                u.full_name as student_name,
                s.matric_no,
                s.supervisor_id
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE s.user_id = ?
        `;
        const studentRows = await Dailylog.query(studentSql, [student_id]);
        const student = studentRows[0];

        // Create notification for supervisor if student has one
        if (student && student.supervisor_id) {
            // Format the log date for display (from YYYY-MM-DD to readable format)
            const dateObj = new Date(log_date + 'T00:00:00'); // Add time to avoid timezone issues
            const formattedDate = dateObj.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Use the notification helper function
            await createNotification(
                student.supervisor_id,
                `${student.student_name} (${student.matric_no}) submitted a new log entry for ${formattedDate}`,
                'logbook'
            );
            console.log('Notification created for supervisor');
        }
        
        console.log('=== Daily log processing complete ===\n');
    
        res.json({
            status: "success",
            message: "Dailylog created successfully",
            data: {
                ...dailyLog,
                attachments: attachments,
            },
        });
    } catch (error) {
        console.error('Store daily log error:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to create dailylog: " + error.message,
        });
    }
};

// Admin: logs of their own school's students. ITF: every log.
const getDailylogs = async (req, res) => {
  try {
    const dailylogs = req.user.role === "admin"
      ? await Dailylog.query(
          `SELECT dl.* FROM daily_logs dl
             JOIN students s ON s.user_id = dl.student_id
             JOIN admins a ON a.school_id = s.school_id
            WHERE a.user_id = ?`,
          [req.user.id]
        )
      : await Dailylog.fetch();
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
        DATE_FORMAT(dl.log_date, '%Y-%m-%d') as log_date_formatted,
        (SELECT COUNT(*) FROM log_attachments WHERE log_id = dl.id) as attachment_count
      FROM daily_logs dl
      WHERE dl.student_id = ?
      ORDER BY dl.log_date DESC
    `;
    
    const dailylogs = await Dailylog.query(sql, [student_id]);
    
    // Fetch attachments for each log and format the date
    for (let log of dailylogs) {
      const attachmentsSql = "SELECT * FROM log_attachments WHERE log_id = ?";
      const attachments = await LogAttachment.query(attachmentsSql, [log.id]);
      log.attachments = attachments;
      
      // Replace log_date with the formatted string to avoid timezone issues
      log.log_date = log.log_date_formatted;
      delete log.log_date_formatted;
    }
    
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

// Fields the author may change. Status and supervisor_comment are set only by
// the approve/reject endpoints.
const EDITABLE_LOG_FIELDS = ['description', 'skills_acquired', 'challenges_faced', 'log_date'];

// PUT and PATCH /logs/:id. Routes have already checked the caller wrote this log
// and that it is not approved (req.dailyLog). Editing a rejected log resubmits it.
const partialDailylogUpdate = async (req, res) => {
  const { id } = req.params;

  try {
    const fields = pick(req.body, EDITABLE_LOG_FIELDS);
    if (typeof fields.log_date === 'string' && fields.log_date.includes('T')) {
      fields.log_date = fields.log_date.split('T')[0];
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        status: "error",
        message: `No fields to update. Allowed fields: ${EDITABLE_LOG_FIELDS.join(', ')}`,
      });
    }
    if ('description' in fields && !String(fields.description).trim()) {
      return res.status(400).json({ status: "error", message: "description cannot be empty" });
    }

    const updateFields = Object.keys(fields).map((key) => `${key} = ?`);
    const updateValues = Object.values(fields);

    if (req.dailyLog.status === 'rejected') {
      updateFields.push("status = 'pending'");
    }
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateSql = `UPDATE daily_logs SET ${updateFields.join(', ')} WHERE id = ?`;
    await Dailylog.query(updateSql, updateValues);

    const updatedLog = await Dailylog.find(id);

    res.json({
      status: "success",
      message: "Dailylog updated successfully",
      data: updatedLog,
    });
  } catch (error) {
    console.error('Update dailylog error:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to update dailylog",
    });
  }
};

const updateDailylog = partialDailylogUpdate;

const approveDailyLog = async (req, res) => {
  let { id } = req.params;
  let { supervisor_comment } = req.body;
  
  try {
    const sql = "UPDATE daily_logs SET status = 'approved', supervisor_comment = ? WHERE id = ?";
    await Dailylog.query(sql, [supervisor_comment || null, id]);
    
    const dailylog = await Dailylog.find(id);
    
    // ✅ ONLY ADDITION: Create notification for student
    const studentSql = `
      SELECT 
        s.user_id as student_id,
        u.full_name as student_name,
        DATE_FORMAT(dl.log_date, '%Y-%m-%d') as formatted_date
      FROM daily_logs dl
      JOIN students s ON dl.student_id = s.user_id
      JOIN users u ON s.user_id = u.id
      WHERE dl.id = ?
    `;
    const studentRows = await Dailylog.query(studentSql, [id]);
    const student = studentRows[0];

    if (student) {
      const dateObj = new Date(student.formatted_date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      await createNotification(
        student.student_id,
        `Your log entry for ${formattedDate} has been approved${supervisor_comment ? ' with feedback' : ''}`,
        'approval'
      );
      console.log('✅ Notification sent to student');
    }
    // ✅ END OF ADDITION
    
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

const rejectDailyLog = async (req, res) => {
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
    
    // ✅ ONLY ADDITION: Create notification for student
    const studentSql = `
      SELECT 
        s.user_id as student_id,
        u.full_name as student_name,
        DATE_FORMAT(dl.log_date, '%Y-%m-%d') as formatted_date
      FROM daily_logs dl
      JOIN students s ON dl.student_id = s.user_id
      JOIN users u ON s.user_id = u.id
      WHERE dl.id = ?
    `;
    const studentRows = await Dailylog.query(studentSql, [id]);
    const student = studentRows[0];

    if (student) {
      const dateObj = new Date(student.formatted_date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      await createNotification(
        student.student_id,
        `Your log entry for ${formattedDate} was rejected. Please review the feedback and resubmit.`,
        'rejection'
      );
      console.log('✅ Notification sent to student');
    }
    // ✅ END OF ADDITION
    
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
  storeDailyLog,       
  getDailylogs,
  getDailylogById,
  getDailylogsByStudent,
  updateDailylog,
  partialDailylogUpdate,
  approveDailyLog,      
  rejectDailyLog,      
  deleteDailylog,
};
