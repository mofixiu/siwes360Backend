const Model = require("./Model");

class Notification extends Model {
  static table = "notifications";
}

module.exports = Notification;