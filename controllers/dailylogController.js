const { get } = require("../app");
const Dailylog = require("../models/Dailylog");

const storeDailylog = async (req, res) => {
  let { student_id, log_date, description, supervisor_comment } = req.body;
  
  try {
    const dailylog = Dailylog.fill({ student_id, log_date, description, supervisor_comment });
    await dailylog.insert();
    
    res.json({
      status: "success",
      message: "Dailylog added successfully",
      data: dailylog,
    });
  } catch (error) {
    console.error('Error creating dailylog:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to create dailylog: " + error.message,
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
  let { id } = req.params; // Changed from dailylog_id to id to match the route
  
  try {
    const dailylog = await Dailylog.find(id);
    if (!dailylog) {
      return res.status(404).json({
        status: "error",
        message: "Dailylog not found",
      });
    }
    
    res.json({
      status: "success",
      message: "Dailylog fetched successfully",
      data: dailylog,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dailylog: " + error.message,
    });
  }
};

const updateDailylog = async (req, res) => {
  let { id } = req.params;
  let { student_id, log_date, description, supervisor_comment } = req.body;
  
  try {
    const dailylog = await Dailylog.find(id);
    if (!dailylog) {
      return res.status(404).json({
        status: "error",
        message: "Dailylog not found",
      });
    }

    dailylog.fill({ student_id, log_date, description, supervisor_comment });
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

const deleteDailylog = async (req, res) => {
  let { id } = req.params;
  
  try {
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
  updateDailylog,
  partialDailylogUpdate,
  deleteDailylog,
};
