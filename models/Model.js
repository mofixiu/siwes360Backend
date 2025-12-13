const connection = require("./Connection");

class Model {
  static async query(sql, params = []) {
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  static get table() {
    // Default: pluralize class name and lowercase
    return this.name.toLowerCase() + 's';
  }

  static async fetch() {
    console.log(`Fetching from table: ${this.table}`); // ADD THIS DEBUG LINE
    const sql = `SELECT * FROM ${this.table}`;
    return await this.query(sql);
  }

  static async find(id) {
    console.log(`Finding in table: ${this.table}`); // ADD THIS DEBUG LINE
    const sql = `SELECT * FROM ${this.table} WHERE id = ? OR user_id = ?`;
    const rows = await this.query(sql, [id, id]);
    return rows[0];
  }

  static fill(data) {
    const instance = new this();
    Object.assign(instance, data);
    return instance;
  }

  async insert() {
    const keys = Object.keys(this).filter(key => this[key] !== undefined && key !== 'id');
    const values = keys.map(key => this[key]);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    const tableName = this.constructor.table; // USE THIS
    console.log(`Inserting into table: ${tableName}`); // ADD THIS DEBUG LINE
    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    
    console.log('SQL:', sql); // ADD THIS DEBUG LINE
    console.log('Values:', values); // ADD THIS DEBUG LINE
    
    try {
      const [result] = await connection.execute(sql, values);
      this.id = result.insertId;
      return this;
    } catch (error) {
      console.error('Insert error:', error);
      throw error;
    }
  }

  async update() {
    const keys = Object.keys(this).filter(key => this[key] !== undefined && key !== 'id' && key !== 'user_id');
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => this[key]);

    const idKey = this.user_id ? 'user_id' : 'id';
    const idValue = this.user_id || this.id;
    
    const tableName = this.constructor.table; // USE THIS
    console.log(`Updating table: ${tableName}`); // ADD THIS DEBUG LINE
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${idKey} = ?`;
    values.push(idValue);

    try {
      await connection.execute(sql, values);
      return this;
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    const tableName = this.table; // USE THIS
    console.log(`Deleting from table: ${tableName}`); // ADD THIS DEBUG LINE
    const sql = `DELETE FROM ${tableName} WHERE id = ? OR user_id = ?`;
    
    try {
      const [result] = await connection.execute(sql, [id, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }
}

module.exports = Model;