const { Router } = require("express");
const router = Router();

const { 
  storeUser, 
  getUsers, 
  getUserById, 
  partialUserUpdate, 
  deleteUser,
  updateUser // Add this import
} = require("../controllers/userController");

router.post("/", storeUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", partialUserUpdate);
router.put("/:id", updateUser); // Add this route
router.delete("/:id", deleteUser);

module.exports = router;
