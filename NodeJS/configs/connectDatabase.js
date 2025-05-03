import { Sequelize, DataTypes } from 'sequelize'; // Nhập cả Sequelize và DataTypes
import mysql from 'mysql2'
// Kết nối Sequelize
const sequelize = new Sequelize('doan4', 'root', '', {
    host: 'localhost',
    dialect: 'mysql', // Hoặc 'postgres', 'sqlite' nếu sử dụng loại cơ sở dữ liệu khác
});

export { sequelize, DataTypes };  // Xuất cả sequelize và DataTypes
