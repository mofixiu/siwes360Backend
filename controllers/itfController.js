const Itf = require("../models/Itf");

const storeItfPersonnel = async (req, res) => {
    let { user_id, region } = req.body;
    const itf = Itf.fill({ user_id, region });
    await itf.insert();
    res.json({
        status: "success",
        message: "Itf added successfully",
        data: itf,
    });
};

const getItfPersonnel = async (req, res) => {
    const itfs = await Itf.fetch();
    res.json({
        status: "success",
        message: "Itfs fetched successfully",
        data: itfs,
    });
};

const getItfPersonnelById = async (req, res) => {
    let { id } = req.params;
    const itf = await Itf.find(id);
    if (!itf) {
        return res.status(404).json({
            status: "error",
            message: "Itf not found",
        });
    }
    res.json({
        status: "success",
        message: "Itf fetched successfully",
        data: itf,
    });
};

const partialItfPersonnelUpdate = async (req, res) => {
    let { id } = req.params;
    const itf = await Itf.find(id);
    if (!itf) {
        return res.status(404).json({
            status: "error",
            message: "Itf not found",
        });
    }
    itf.fill(req.body);

    await itf.update();

    res.json({
        status: "success",
        message: "Itf updated successfully",
        data: itf,
    });
};

const deleteItfPersonnel = async (req, res) => {
    let { id } = req.params;
    const deleted = await Itf.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete itf",
        });
    }

    res.json({
        status: "success",
        message: "Itf deleted successfully",
    });
};


module.exports = {
    storeItfPersonnel,
    getItfPersonnel,
    getItfPersonnelById,
    partialItfPersonnelUpdate,
    deleteItfPersonnel,
};
