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
    // use this for real work the one below is just for this project
    //  console.log(`Finding in table: ${this.table}`); // ADD THIS DEBUG LINE
    // const sql = `SELECT * FROM ${this.table} WHERE id = ? OR user_id = ?`;
    // const rows = await this.query(sql, [id, id]);
    // return rows[0];
    const tableName = this.table;
    console.log(`Finding in table: ${tableName}`);
    
    // Tables that use 'id' as primary key only (no user_id)
    const idOnlyTables = ['daily_logs', 'log_attachments', 'notifications', 'schools'];
    
    // Tables that use 'user_id' as primary key only (no id column)
    const userIdOnlyTables = ['supervisors', 'students', 'coordinators', 'admins', 'itf'];
    
    let sql;
    if (idOnlyTables.includes(tableName)) {
      // For tables with only 'id' primary key
      sql = `SELECT * FROM ${tableName} WHERE id = ?`;
      const [rows] = await connection.execute(sql, [id]);
      return rows.length > 0 ? this.fill(rows[0]) : null;
    } else if (userIdOnlyTables.includes(tableName)) {
      // For tables with only 'user_id' primary key
      sql = `SELECT * FROM ${tableName} WHERE user_id = ?`;
      const [rows] = await connection.execute(sql, [id]);
      return rows.length > 0 ? this.fill(rows[0]) : null;
    } else {
      // For tables with both 'id' and 'user_id' (fallback, shouldn't reach here)
      sql = `SELECT * FROM ${tableName} WHERE id = ? OR user_id = ?`;
      const [rows] = await connection.execute(sql, [id, id]);
      return rows.length > 0 ? this.fill(rows[0]) : null;
    }
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
    const tableName = this.table;
    console.log(`Deleting from table: ${tableName}`);
    
    // Tables that use 'id' as primary key only (no user_id)
    const idOnlyTables = ['daily_logs', 'log_attachments', 'notifications', 'schools'];
    
    // Tables that use 'user_id' as primary key only (no id column)
    const userIdOnlyTables = ['supervisors', 'students', 'coordinators', 'admins', 'itf'];
    
    let sql;
    if (idOnlyTables.includes(tableName)) {
      // For tables with only 'id' primary key
      sql = `DELETE FROM ${tableName} WHERE id = ?`;
      const [result] = await connection.execute(sql, [id]);
      return result.affectedRows > 0;
    } else if (userIdOnlyTables.includes(tableName)) {
      // For tables with only 'user_id' primary key
      sql = `DELETE FROM ${tableName} WHERE user_id = ?`;
      const [result] = await connection.execute(sql, [id]);
      return result.affectedRows > 0;
    } else {
      // For tables with both 'id' and 'user_id' (fallback)
      sql = `DELETE FROM ${tableName} WHERE id = ? OR user_id = ?`;
      const [result] = await connection.execute(sql, [id, id]);
      return result.affectedRows > 0;
    }
  }
}

module.exports = Model;