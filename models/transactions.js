const {DataTypes}= require('sequelize')
const {sequelize}= require('../config/database')

Transaction = sequelize.define('Transaction',{
    id:{type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true},
    uid:{type:DataTypes.INTEGER,
        allowNull:false},
    amount:{type:DataTypes.DECIMAL,
        allowNull:false},
    currency:{type:DataTypes.STRING,
        defaultValue:'USD',
        allowNull:true},
    type:{type:DataTypes.STRING,
        allowNull:false},
    status:{type:DataTypes.STRING,
        allowNull:false},
    reference:{type:DataTypes.STRING,
        allowNull:true,
        unique:true},
    createdAt:{type:DataTypes.DATE,
        allowNull:false},
    updatedAt:{type:DataTypes.DATE,
        allowNull:false}
})

module.exports = Transaction;