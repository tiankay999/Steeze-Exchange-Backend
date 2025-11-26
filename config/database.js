// config/database.js
const dotenv = require("dotenv");
dotenv.config(); // safe locally, harmless on Vercel

const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");

// DEBUG: log what Vercel actually sees (no password printed)
console.log("DB ENV:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  name: process.env.DB_NAME,
  hasPassword: !!process.env.DB_PASSWORD,
});

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectModule: mysql2,
    logging: false,
  }
);

module.exports = { sequelize };
