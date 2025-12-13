const Model = require('./Model');

class Dailylog extends Model {
  static get table() {
    return 'daily_logs'; // Explicitly set the correct table name
  }
}

module.exports = Dailylog;