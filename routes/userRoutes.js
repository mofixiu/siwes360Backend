const { Router } = require("express");
const router = Router();

const {
  storeUser,
  getUsers,
  getUserById,
  partialUserUpdate,
  deleteUser,
  updateUser,
} = require("../controllers/userController");
const allowRoles = require("../middlewares/allowRoles");
const { selfOrRoles } = require("../middlewares/access");

// Mounted behind verifyToken in app.js.
router.post("/", allowRoles("admin"), storeUser);
router.get("/", allowRoles("admin"), getUsers);
router.get("/:id", selfOrRoles("id", "admin"), getUserById);
router.patch("/:id", selfOrRoles("id", "admin"), partialUserUpdate);
router.put("/:id", selfOrRoles("id", "admin"), updateUser);
router.delete("/:id", allowRoles("admin"), deleteUser);

module.exports = router;
