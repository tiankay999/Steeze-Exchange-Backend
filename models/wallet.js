const {DataTypes}= require('sequelize')
const{sequelize}= require('../config/database')

Wallet =   sequelize.define('Wallet',{
    id:{type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true},
    uid:{type:DataTypes.INTEGER,
        allowNull:false,
        unique:true},
    balance:{type:DataTypes.DECIMAL,
        allowNull:false,
        defaultValue:0},
    currency:{type:DataTypes.STRING,
        allowNull:false,
        defaultValue:'USD'},

})

module.exports = Wallet;