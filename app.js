var createError = require('http-errors');
var express = require('express');
const conn = require('./conn') 
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


require('dotenv').config();

//session
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);


var app = express();
var cors = require('cors')


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var memberRouter = require('./routes/member');
var diceRouter = require('./routes/diceGame');
var backendLoginRouter = require('./routes/backendLogin');
var backendRouter = require('./routes/backend');
var turntableRouter = require('./routes/turntable');
var chatdoraraRouter= require('./routes/chatdorara')
/*
app.use((req, res ,next) =>
{
    res.header("Access-Control-Allow-Origin","*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept,Authorization"
        );
    if (req.method === 'OPTIONS')
    {
        res.header('Access-Control-Allow-Methods','PUT,POST,PATCH,DELETE,GET');
        return res.status(200).json({});
    }

  // Pass next middleware
  next();

});*/


conn.connect();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.set('view engine', 'ejs');


app.use(cors());


/*
// 監聽本地端 3000 port
const port = process.env.PORT || 3000;
const server = require('http').Server(app).listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

const io = require('socket.io')(server);

io.on('connection', socket => {
  console.log('連接成功，上線ID: ', socket.id);
  // 監聽訊息
  socket.on('getMessage', message => {
    console.log('服務端 接收 訊息: ', message);
    //回傳 message 給客戶端
    socket.emit('getMessage', message);
  });
  // 連接斷開
  socket.on('disconnect', () => {
    console.log('有人離開了！， 下線ID: ', socket.id);
  });
});
*/
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/member', memberRouter);
app.use('/diceGame', diceRouter);
app.use('/backendLogin', backendLoginRouter);
app.use('/backend', backendRouter);
app.use('/turntable', turntableRouter);
app.use('/chatdorara', chatdoraraRouter);



app.use('/sessioncheck',function(req,res){
	//獲取session
	if(req.session.userinfo){
		res.send("登入中 : "+req.session.userinfo+" !");
	}else{
		res.send("未登陸");
	}
});

app.use('/loginout',function(req,res){
	//註銷session
	req.session.destroy(function(err){
		res.send("退出登錄！"+err);
	});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});





// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
