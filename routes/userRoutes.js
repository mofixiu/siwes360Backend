const { Router } = require("express");
const router = Router();

const { getUsers, getUserById, deleteUser,partialUserUpdate } = require("../controllers/userController");

// Example user management routes
router.get("/", getUsers);
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);
router.patch("/:id", partialUserUpdate);

module.exports = router;
