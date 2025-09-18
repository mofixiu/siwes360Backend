const connection = require('./Connection');
const pluralize = require('pluralize');
class Model {
    static async query(sql, values = []) {
        values = Array.isArray(values) ? values : [values];
        values = values.map(v => v === undefined ? null : v);
        return (await connection.execute(sql, values))[0];
    }

    async query(sql, values = []) {
        return await this.constructor.query(sql, values);
    }

    static async columns() {
        const sql = `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = ?`;
        const rows = await this.query(sql, this.tableName);
        return rows.map(row => row.COLUMN_NAME);
    }
    async columns() {
        return await this.constructor.columns();
    }

    static get tableName() {
        return pluralize(this.name.toLowerCase())
    }

    static fill(obj = {}) {
        const data = new this()
        for (const key in obj) {
            data[key] = obj[key];
        }
        return data
    }

    fill(obj = {}) {
        for (const key in obj) {
            this[key] = obj[key];
        }
    }

    async insert() {
        const fields = Object.keys(this);
        const values = Object.values(this);
        const placeholders = '?'.repeat(values.length).split('').join(', ')
        const sql = `INSERT INTO ${this.constructor.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        const rows = await this.query(sql, values);
        this.id = rows.insertId;
        return this;
    }


    async update() {
        const obj = this
        const id = this.id
        delete obj.id
        delete obj.created_at
        delete obj.updated_at
        const fields = Object.keys(obj);
        const values = Object.values(obj);
        const placeholders = fields.map(f => `${f} = ?`).join(', ')
        const sql = `UPDATE ${this.constructor.tableName} SET ${placeholders} WHERE id = ?`;
        const result = await this.query(sql, [...values, id]);
        return result.affectedRows > 0;
    }

    async save() {
        return this.id ? this.update() : this.insert();
    }

    static async fetch() {
        let results = [];
        const sql = `SELECT * FROM ${this.tableName}`;
        const rows = await this.query(sql);
        for (const row of rows) {
            const program = this.fill(row);
            results.push(program);
        }
        return results;
    }

    static async find(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        const rows = await this.query(sql, id);
        if (rows.length === 0) {
            return null;
        }
        return this.fill(rows[0]);
    }

    async delete() {
        const sql = `DELETE FROM ${this.constructor.tableName} WHERE id = ?`;
        const res = await this.query(sql, this.id);
        return res.affectedRows > 0;
    }

    static async delete(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const res = await this.query(sql, id);
        return res.affectedRows > 0;
    }

    static async count() {
        const sql = `SELECT COUNT(id) AS count FROM ${this.tableName}`;
        const rows = await this.query(sql);
        return rows[0].count
    }
}

module.exports = Model