const School = require("../models/School");
const storeSchool = async (req, res) => {
    let { name,address } = req.body;
    const school = School.fill({ name,address });
    await school.insert();
    res.json({
        status: "success",
        message: "School added successfully",
        data: school,
    });
};

const getSchools = async (req, res) => {
    const schools = await School.fetch();
    res.json({
        status: "success",
        message: "Schools fetched successfully",
        data: schools,
    });
};

const getSchoolById = async (req, res) => {
    let { id } = req.params;
    const school = await School.find(id);
    if (!school) {
        return res.status(404).json({
            status: "error",
            message: "School not found",
        });
    }
    res.json({
        status: "success",
        message: "School fetched successfully",
        data: school,
    });
};

const updateSchool = async (req, res) => {
    let { id } = req.params;
    let { name, address } = req.body;
    const school = await School.find(id);
    if (!school) {
        return res.status(404).json({
            status: "error",
            message: "School not found",
        });
    }
    school.fill({ name, address });
    await school.update();

    res.json({
        status: "success",
        message: "School updated successfully",
        data: school,
    });
};

const partialSchoolUpdate = async (req, res) => {
    let { id } = req.params;
    const school = await School.find(id);
    if (!school) {
        return res.status(404).json({
            status: "error",
            message: "School not found",
        });
    }
    school.fill(req.body);

    await school.update();

    res.json({
        status: "success",
        message: "School updated successfully",
        data: school,
    });
};

const deleteSchool = async (req, res) => {
    let { id } = req.params;
    const deleted = await School.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete school",
        });
    }

    res.json({
        status: "success",
        message: "School deleted successfully",
    });
};
const getHotelSchools = async (req, res) => {
    const { hotelId } = req.params;
    const schools = await School.find({ hotel_id: hotelId });
    res.json({
        status: "success",
        message: "Hotel schools fetched successfully",
        data: schools,
    });
};

const getAvailableSchools = async (req, res) => {
  try {
    const { hotel_id, check_in, check_out } = req.query;
    
    if (!hotel_id) {
      return res.status(400).json({
        status: "error",
        message: "Hotel ID is required",
      });
    }

    console.log(`Getting available schools for hotel: ${hotel_id}`);
    console.log(`Check-in: ${check_in}, Check-out: ${check_out}`);

    // Get all schools for the hotel that are not booked during the requested period
    let query = `
      SELECT r.* 
      FROM schools r
      WHERE r.hotel_id = ? 
      AND r.status = 'Available'
    `;

    let params = [hotel_id];

    // If dates are provided, exclude schools that are booked during this period
    if (check_in && check_out) {
      query += `
        AND r.id NOT IN (
          SELECT DISTINCT b.school_id 
          FROM bookings b 
          WHERE b.school_id = r.id 
          AND b.status IN ('Booked', 'Checked-In')
          AND (
            (b.check_in_date <= ? AND b.check_out_date > ?) OR
            (b.check_in_date < ? AND b.check_out_date >= ?) OR
            (b.check_in_date >= ? AND b.check_out_date <= ?)
          )
        )
      `;
      params.push(check_in, check_in, check_out, check_out, check_in, check_out);
    }

    query += ` ORDER BY r.school_number`;

    const schools = await School.query(query, params);

    console.log(`Found ${schools.length} available schools`);

    res.json({
      status: "success",
      message: "Available schools fetched successfully",
      data: schools,
    });
  } catch (error) {
    console.error('Error fetching available schools:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch available schools: " + error.message,
    });
  }
};
module.exports = {
    storeSchool,
    getSchools,
    getSchoolById,
    updateSchool,
    partialSchoolUpdate,
    deleteSchool,
    getHotelSchools,
    getAvailableSchools
};
