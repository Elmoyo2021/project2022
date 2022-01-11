
var express = require('express');
var app = express();
var router = express.Router();

//const connection = require('../conn');
const huigun = require('../dbHelper.js')

const { query } = require('../async-db')
const mysql = require('mysql2/promise');
const config = require('../config');



/* GET home page. */

router.get('/',async function (req, res, next) {
    const memberData=[]
    const connection = await mysql.createConnection(config.db);
    const [members] = await connection.execute('SELECT * from chat_log  ORDER BY id DESC', memberData );
  console.log(members)
  res.send(members)
});



module.exports = router;
