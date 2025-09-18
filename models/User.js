const Model = require('./Model');
class User extends Model {

    static async findByEmail(email) {
        const sql = "SELECT * FROM users WHERE email = ?";
        const rows = await this.query(sql, [email]);
        if (rows.length === 0) {
            return null;
        }
        return this.fill(rows[0]);
    }
}

module.exports = User;
