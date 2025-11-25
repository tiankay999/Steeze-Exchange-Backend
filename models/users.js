const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

User = sequelize.define('user',{
       id:{type:DataTypes.INTEGER,
         primaryKey:true,
         autoIncrement:true},
     name:{type:DataTypes.STRING,
         allowNull:false},
         username:{type:DataTypes.STRING,
         allowNull:false,
         unique:true},
     email:{type:DataTypes.STRING,
         allowNull:false,
         unique:true},
     password:{type:DataTypes.STRING,
         allowNull:false},
     
      
       
})

module.exports =User;