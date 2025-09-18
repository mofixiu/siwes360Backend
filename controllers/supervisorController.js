const Supervisor = require("../models/Supervisor");

const storeSupervisor = async (req, res) => {
    let { user_id, organization, position } = req.body;
    const supervisor = Supervisor.fill({ user_id, organization, position });
    await supervisor.insert();
    res.json({
        status: "success",
        message: "Supervisor added successfully",
        data: supervisor,
    });
};

const getSupervisors = async (req, res) => {
    const supervisors = await Supervisor.fetch();
    res.json({
        status: "success",
        message: "Supervisors fetched successfully",
        data: supervisors,
    });
};

const getSupervisorById = async (req, res) => {
    let { id } = req.params;
    const supervisor = await Supervisor.find(id);
    if (!supervisor) {
        return res.status(404).json({
            status: "error",
            message: "Supervisor not found",
        });
    }
    res.json({
        status: "success",
        message: "Supervisor fetched successfully",
        data: supervisor,
    });
};

const partialSupervisorUpdate = async (req, res) => {
    let { id } = req.params;
    const supervisor = await Supervisor.find(id);
    if (!supervisor) {
        return res.status(404).json({
            status: "error",
            message: "Supervisor not found",
        });
    }
    supervisor.fill(req.body);

    await supervisor.update();

    res.json({
        status: "success",
        message: "Supervisor updated successfully",
        data: supervisor,
    });
};

const deleteSupervisor = async (req, res) => {
    let { id } = req.params;
    const deleted = await Supervisor.delete(id);
    if (!deleted) {
        return res.status(404).json({
            status: "error",
            message: "Failed to delete supervisor",
        });
    }

    res.json({
        status: "success",
        message: "Supervisor deleted successfully",
    });
};


module.exports = {
    storeSupervisor,
    getSupervisors,
    getSupervisorById,
    partialSupervisorUpdate,
    deleteSupervisor,
};
