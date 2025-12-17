const Model = require("./Model");

class Notification extends Model {
  static table = "notifications";
  static fillable = ["user_id", "message", "type", "is_read"];
}

module.exports = Notification;