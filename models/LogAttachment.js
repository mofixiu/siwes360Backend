const Model = require('./Model');

class LogAttachment extends Model {
  static get table() {
    return 'log_attachments'; // Explicitly set the correct table name
  }
}

module.exports = LogAttachment;