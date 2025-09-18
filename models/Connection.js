const mysql = require('mysql2/promise');
require('dotenv').config();

const { 
    DB_HOST = "localhost", 
    DB_USER = 'root', 
    DB_PASSWORD = 'david001', 
    DB_NAME = 'siwes360', 
    DB_PORT = 3306 
} = process.env;

console.log('Database configuration:');
console.log('Host:', DB_HOST);
console.log('User:', DB_USER);
console.log('Database:', DB_NAME);
console.log('Port:', DB_PORT);
console.log('Password provided:', DB_PASSWORD ? 'Yes' : 'No');

const connection = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: parseInt(DB_PORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false
});

// Test the connection immediately
const testConnection = async () => {
    try {
        console.log('Testing database connection...');
        const testConn = await connection.getConnection();
        console.log('✅ Database connection successful!');
        testConn.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        return false;
    }
};

// Test connection when module loads
testConnection();

module.exports = connection;