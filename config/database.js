// config/database.js
const dotenv = require("dotenv");
dotenv.config();

const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");

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
