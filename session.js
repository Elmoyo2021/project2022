//session
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var options = {
    host     : 'localhost',
    port: 3306,
    user     : 'root',
    password : '7cfea67be41d2eac',
    database : 'demo1'	//數據庫名
  };
  
  var sessionStore = new MySQLStore(options);
  app.use(session({
    key: 'elmonight',	//自行設置的簽名
    secret: "keysec2sjja",		//密匙
    store: sessionStore,		//存儲管理器
    resave: false,
    saveUninitialized: false
  }));

  module.exports = sessionmd;