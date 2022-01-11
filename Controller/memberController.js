const memberModel = require('../Model/memberModel');  // 引入 model
const db = require('../conn')
const { query } = require('../async-db')
const { check, validationResult } = require('express-validator')
var moment = require('moment')


const mysql = require('mysql2/promise');
const config = require('../config');



const memberController = {
  post: (req, res) => { //會員註冊
    const memberData = {
      name: req.body.name,
      email: req.body.email,
      account: req.body.account,
      pwd: req.body.pwd
    }

    // 將資料寫入資料庫

    const errors = validationResult(req)
    if (!errors.isEmpty()) {//是否有正確填寫欄位值
      var errorrmsg = errors.array();
      var emsg = "";
      errorrmsg.forEach(function (erow, i) {//錯誤訊息
        emsg = emsg + erow.msg + " ";
      })
      return res.json({
        code: 401,
        msg: emsg,
        data: ""

      });
    } else {
      memberModel.register(memberData).then(result => {
        res.send(result);
      })
    }

  },
  getall: async (req, res) => { //會員搜尋
    const memberData = {
      name: req.body.name,
      email: req.body.email,
      account: req.body.account
    }

    var memberlist = await selectAllData(memberData)
    //console.log(memberlist.length);
    if (memberlist.length > 0) {
      return res.json({
        code: 200,
        msg: "",
        data: memberlist
      });
    } else {
      return res.json({
        code: 401,
        msg: "查無相關資料",
        data: ""

      });
    }
  },

  memberUpdate: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {//是否有正確填寫欄位值
      var errorrmsg = errors.array();
      console.log(errorrmsg)
      var emsg = "";
      errorrmsg.forEach(function (erow, i) {//錯誤訊息
        emsg = emsg + erow.msg + " ";
      })
      return res.json({
        code: 401,
        msg: errorrmsg,
        data: ""

      });
    } else {
      const memberData = {
        name: req.body.name,
        email: req.body.email,
        pwd: req.body.pwd,
        account: req.session.userinfo
      }
      console.log(memberData)
      await UpdateMember(memberData)
      return res.json({
        code: 200,
        msg: "",
        data: memberData


      });
    }
  },
  memberUpdatePwd: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {//是否有正確填寫欄位值
      var errorrmsg = errors.array();
      console.log(errorrmsg)
      var emsg = "";
      errorrmsg.forEach(function (erow, i) {//錯誤訊息
        emsg = emsg + erow.msg + " ";
      })
      return res.json({
        code: 401,
        msg: errorrmsg,
        data: ""

      });
    } else {
      const memberData = {
        pwd: req.body.pwd,
        account: req.session.userinfo
      }

      const members = await selectMemberData(memberData) //抓舊密碼
      if (members[0].pwd != req.body.pwd_old) {
        return res.json({
          code: 401,
          msg: "舊密碼不一致",
          data: ""
        });
      }
      await UpdateMemberPwd(memberData)
      const membersNews = await selectMemberData(memberData) //抓舊密碼
      return res.json({
        code: 200,
        msg: "修改密碼成功",
        data: membersNews
      });
    }
  },

  forgetall: async (req, res) => { //忘記密碼
    const memberData = {
      email: req.body.email,
      account: req.body.account
    }

    var memberlist = await forgetAllData(memberData)
    const errors = validationResult(req)
    if (!errors.isEmpty()) {//是否有正確填寫欄位值
      var errorrmsg = errors.array();
      var emsg = "";
      errorrmsg.forEach(function (erow, i) {//錯誤訊息
        emsg = emsg + erow.msg + " ";
      })
      return res.json({
        code: 401,
        msg: emsg,
        data: ""

      });
    } else {
      if (memberlist.length > 0) {
        return res.json({
          code: 200,
          msg: "",
          data: memberlist
        });
      } else {
        return res.json({
          code: 401,
          msg: "帳號或信箱不符合，查無相關資料!",
          data: ""

        });
      }
    }
  },
  checkMember: async (req, res) => {

    const memberData = {
      account: req.session.userinfo
    }
    console.log(req.session.userinfo)
    const dataList = await selectMemberData(memberData)
    const reMember = {
      account: dataList[0].account,
      name: dataList[0].name,
      email: dataList[0].email,
      money: dataList[0].money
    }
    return res.json({
      code: 200,
      msg: "",
      data: reMember

    });
  },
  addList: async (req, res) => {//會員加值紀錄

    const memberData = {
      account: req.session.userinfo
    }
    console.log(req.session.userinfo)
    const dataLists = await AddValueData(memberData)
    const returnData = []
    for (i = 0; i < dataLists.length; i++) {
      detailData = {
        account: dataLists[i].account,
        money: dataLists[i].money,
        money_final: dataLists[i].money_final,
        bank: dataLists[i].bank,
        transfer_account: dataLists[i].transfer_account,
        Createtime: moment(dataLists[i].Createtime).format('YYYY-MM-DD HH:mm:ss')
      }
      returnData.push(detailData);
    }


    return res.json({
      code: 200,
      msg: "查詢成功",
      data: returnData

    });
  },
  withdrawal: async (req, res) => {
    const money = req.body.money;
    //*************************事務START************************************** *//
    const memberData = [req.session.userinfo]
    const connection = await mysql.createConnection(config.db);
    await connection.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    //console.log('隔離級別設定為交讀');
    await connection.beginTransaction();
    try {
      await connection.execute('SELECT * FROM withdrawal_log WHERE member_id=?  FOR UPDATE', memberData); //Locked Table member
      const [members] = await connection.execute(
        'SELECT account,pwd, money, money from members WHERE account=?  ORDER BY id', memberData
      ); //查看會員目前剩餘金額
      console.log("O")

      const [withdrawals] = await connection.execute(
        'SELECT sum(money) as money FROM `withdrawal_log` where status="未審核" and member_id=? group by member_id', memberData
      ); //查看目前剩餘金額
      console.log("X")
      var withMoney = 0
      if (withdrawals.length <= 0) {
        withMoney = 0;
      } else {
        withMoney=withdrawals[0].money
      }
      const membersMoney = Number(members[0].money) - Number(withMoney)
      if (Number(money) > Number(membersMoney)) {//回傳下注失敗超出金額
        throw new Error(membersMoney)
      }

      const InsertBetDetailData = [req.session.userinfo, '未審核', money]
      await connection.execute(
        'INSERT INTO withdrawal_log (member_id,status,money) VALUES (?, ?, ?)',
        InsertBetDetailData
      )
      //console.log(`下注INSERT`);


      await connection.commit();
      const RbData = {
        money: money,
        user: req.session.userinfo
      }
      return res.json({
        code: 200,
        msg: "提交申請成功",
        data: RbData

      });
    } catch (err) {
      connection.rollback();
      return res.json({//回傳提款失敗超出金額
        code: 401,
        msg: "提交失敗，超出可提款金額",
        data: [{ Remaining_money: err.message }]//剩餘可提領金額
      });

    }

    //**************************事務END*************************************** *//

  },
  withdrawal_list: async (req, res) => {
    
    var skip = 0
    var limit = 10
    var orderBy = "id"
    var orderType = "ASC"
    if (req.body.skip != '') {
      skip = req.body.skip
    }
    if (req.body.limit != '') {
      limit = req.body.limit
    }
    if (req.body.orderBy != '') {
      orderBy = req.body.orderBy
    }
    if (req.body.orderType != '') {
      orderType = req.body.orderType
    }
    const selectData = {
      account: req.session.userinfo,
      skip: skip,
      limit: limit,
      orderBy: orderBy,
      orderType: orderType //每頁數量
    }
    const totals = await withdrawalTotal(selectData);
    console.log(totals)
    console.log(limit)
    const allPages = Math.ceil(Number(totals[0].total) / Number(limit)) //總頁數
    console.log(allPages)
    const withdrawals = await withdrawalData(selectData);
    return res.json({//回傳結果
      code: 200,
      msg: "提款記錄列表",
      data: withdrawals
    });
  }
}





function selectAllData(mdata) {//查看會員
  let sql = 'SELECT * FROM members where name like ? and email like ? and account like ?'
  let dataList = query(sql, [mdata.name + '%', mdata.email + '%', mdata.account + '%'])
  return dataList
}

function forgetAllData(mdata) {//查看是否已經註
  let sql = 'SELECT * FROM members where email = ? and account = ?'
  let dataList = query(sql, [mdata.email, mdata.account])
  return dataList
}


function UpdateMember(data) {//更新
  let sql = 'UPDATE members SET name=?,email=? where account=?'
  let dataList = query(sql, [data.name, data.email, data.account])
  return dataList
}


function UpdateMemberPwd(data) {//更新密碼
  let sql = 'UPDATE members SET pwd=? where account=?'
  let dataList = query(sql, [data.pwd, data.account])
  return dataList
}


function selectMemberData(data) {
  let sql = 'SELECT * FROM members where account = ?'
  let dataList = query(sql, [data.account])
  return dataList
}


function AddValueData(data) {
  let sql = 'SELECT account,money,money_final,bank,transfer_account,Createtime FROM addvalue_log where account = ? order by id DESC'
  let dataList = query(sql, [data.account])
  return dataList
}

function withdrawalData(data) {//查看會員
  let sql = 'SELECT * FROM withdrawal_log where member_id = ? order by id DESC'
  let dataList = query(sql, [data.account])
  return dataList
}


function withdrawalTotal(data) {//總數
  let sql = 'SELECT count(*) as total FROM withdrawal_log where member_id = ?'
  let dataList = query(sql, [data.account])
  return dataList
}
module.exports = memberController;