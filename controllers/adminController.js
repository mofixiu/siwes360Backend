const Admin = require("../models/Admin");

const storeAdmin = async (req, res) => {
    let { user_id, school_id } = req.body;
    const admin = Admin.fill({ user_id, school_id });
    await admin.insert();
    res.json({
        status: "success",
        message: "Admin added successfully",
        data: admin,
    });
};

const getAdmins = async (req, res) => {
    const admins = await Admin.fetch();
    res.json({
        status: "success",
        message: "Admins fetched successfully",
        data: admins,
    });
};

const getAdminById = async (req, res) => {
    let { id } = req.params;
    const admin = await Admin.find(id);
    if (!admin) {
        return res.status(404).json({
            status: "error",
            message: "Admin not found",
        });
    }
    res.json({
        status: "success",
        message: "Admin fetched successfully",
        data: admin,
    });
};

const partialAdminUpdate = async (req, res) => {
    let { id } = req.params;
    const admin = await Admin.find(id);
    if (!admin) {
        return res.status(404).json({
            status: "error",
            message: "Admin not found",
        });
    }
    admin.fill(req.body);

    await admin.update();

    res.json({
        status: "success",
        message: "Admin updated successfully",
        data: admin,
    });
};

const deleteAdmin = async (req, res) => {
    let { id } = req.params;
    const deleted = await Admin.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete admin",
        });
    }

    res.json({
        status: "success",
        message: "Admin deleted successfully",
    });
};


module.exports = {
    storeAdmin,
    getAdmins,
    getAdminById,
    partialAdminUpdate,
    deleteAdmin,
};
