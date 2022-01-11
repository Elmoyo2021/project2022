var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var app = express();

//DB 
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'user1',
  password: 'RuDSW17utjRdIyXp',
  database: 'demo1'
});

connection.connect(function(err) {
  if (err) {
    return console.error('error: ' + err.message);
  }

  //console.log('Connected to the MySQL server.OK!');
});


router.get('/', function(req, res, next) {
  res.send('ABC');

  connection.query('SELECT * from member ', function(error, rows, fields) {
    if (!!error) {
       console.log('Error in the query');
    }else{  
       console.log('The result is: ', rows);
    }
  }); 

});

module.exports = router;
//app.listen(4000);