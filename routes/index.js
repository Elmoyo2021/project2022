
var express = require('express');
var app = express();
var router = express.Router();

//const connection = require('../conn');
const huigun = require('../dbHelper.js')

const { query } = require('../async-db')


const { sequelize, Sequelize } = require('../sequelize')// import connection



/* GET home page. */

router.get('/', function (req, res, next) {
  console.log("OK")
  res.render('index', { title: 'Express' });
});



function _getNewSqlParamEntity(sql, params, callback) {
  if (callback) {
    return callback(null, {
      sql: sql,
      params: params
    });
  }
  return {
    sql: sql,
    params: params
  };
}


router.get('/test', async function (req, res, next) {
 // res.send('ABCDDD');
  //register()
  const member = sequelize.define('tmember', {
    // 定義 Model 屬性
    name: {     　　　 // 欄位名稱
      type: Sequelize.STRING  //  資料型態
    },
    account: {
      type: Sequelize.STRING
    },
    pwd: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
    }
  }, {
    freezeTableName: false,//設定false 才不會在表名上自動加上s
    tableName: 'tmember'//資料表名稱
  });

    member.create({
      // 記得 value 字串要加上引號
      name: 'Heidi',
      account: 'bcacc741',
      pwd: '7841545asa8s',
      email: 'aco@gmail.com'
    }).then(() => {
      // 執行成功後會印出文字
      console.log('successfully created!!')
    });
    


  member.findOne({
    where: { id: 4 }, // where 條件
    attribute: ['name']
  }).then(member => {
    if (!member) return res.json({code:401,msg:"查無資料",data:""});
    res.json(member);
  });


  /* 
  pool.getConnection(async function (err, connection) {
    if (err) throw err; // not connected!
    try {
      console.log("add starting transaction...");
      await connection.beginTransaction();
      const queryResult = await connection.query('insert bet_detail (group_id,bet_amount) VALUES(?,?)', ['9999', 'Tname003']
      );
      await connection.commit();
      console.log("Commit");
      console.log(queryResult);
      return queryResult;
    } catch (error) {
      await rollback(connection);
      console.error("Error_rollback", error);
      throw error;
    } finally {
      connection.release();
    }

  });*/
  /*
  //connection.getConnection(async function (err, connection) {
    try {
      console.log("add starting transaction...");
      await connection.beginTransaction();
      const queryResult = await connection.query('insert member (name,account) VALUES(?,?)', ['Tname', 'Tname003']
      );

      console.log("addUserDetails, committing transaction...");
      await connection.commit();
      console.log("事務commit");
      return queryResult;


    } catch (error) {
      await rollback(connection);
      console.error("失敗錯誤", error);
      throw error;
    } finally {
      connection.release();
    }
    */





  /*
  await connection.beginTransaction();
  var sqlParamsEntity = [];
  var sql1 = "insert member (name,account) VALUES(?,?)";
  var param1 = [ 'Tname','Tname002' ];
  sqlParamsEntity.push(_getNewSqlParamEntity(sql1, param1));

  
  huigun.execTrans(sqlParamsEntity, function (err, info) {
    if (err) {
      console.error("事務執行失败");
    } else {
      console.log("事務執行成功");
    }
  })*/
});

async function register() {

  await sequelize.transaction({}, async (transaction) => {
    const member = sequelize.define("member", {
      name: {
        type: Sequelize.STRING
      },
      account: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      }
    });



    await member.create({
      name: '王大天',
      account: 'user2011145',
      email: 'xav@gamil.com'
      ,
      transaction,
    });
    /*
    await instance.update({
      name: instance.balances + number,
    }, {
      transaction,
    })*/
  })


}
module.exports = router;
