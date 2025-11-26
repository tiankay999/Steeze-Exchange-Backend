// config/database.js (example)
 const dotenv= require('dotenv')
 dotenv.config();  
const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2"); // 👈 force-load mysql2

const sequelize = new Sequelize(
  process.env.DB_NAME,        
  process.env.DB_USER,        
  process.env.DB_PASSWORD || '',   
  {
    host: process.env.DB_HOST || 'localhost', // ⚠️ must be a cloud DB host, NOT localhost, when on Vercel
    dialect: "mysql",
    dialectModule: mysql2,     // 👈 tell Sequelize to use this module
    logging: false,
  }
);

module.exports = { sequelize };
