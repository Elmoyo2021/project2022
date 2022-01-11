const Sequelize = require('sequelize');
const conn = {};
const sequelize = new Sequelize('demo1', 'root', '7cfea67be41d2eac', {
    host: 'localhost',
    dialect: 'mysql'
});


conn.sequelize = sequelize;
conn.Sequelize = Sequelize;

module.exports = conn;