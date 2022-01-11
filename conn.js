
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '7cfea67be41d2eac',
  database: 'demo1'
});



module.exports = connection;