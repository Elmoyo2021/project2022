//const memberModel = require('../Model/memberModel');  // 引入 model
const db = require('../conn')
const { query } = require('../async-db')
const authUser = require("../authUser")//判斷登入狀態及權限
var _ = require('lodash');



const mysql = require('mysql2/promise');
const config = require('../config');

const turntableController = {
  bet: async (req, res) => {
    const nowtype = req.body.bet_type
    const total = req.body.bet_amount
    const nowData = await selectNowSec()
    const nowSec = nowData[0].sec
    if (nowSec <= 10) {
      return res.json({//回傳下注失敗超出金額
        code: 401,
        msg: "下注失敗，非可下注時間",
        data: ""
      });
    }

    /* 計算是否超出可下注金額*/
    const betData = {
      group_id: nowData[0].id,
      member_id: req.session.userinfo
    }
    const betTotal = await SelectBetData(betData)
    const finalAmount = Number(betTotal[0].money) + Number(total)
    const members = await SelectMemberData(betData)

    //*************************事務START************************************** *//
    const memberData = [req.session.userinfo]
    const memberBetData = [nowData[0].id, req.session.userinfo]
    const connection = await mysql.createConnection(config.db);
    await connection.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    //console.log('隔離級別設定為交讀');
    await connection.beginTransaction();
    try {
      await connection.execute('SELECT name,money FROM members WHERE account=? FOR UPDATE', memberData); //Locked Table member
      await connection.execute('SELECT * FROM turntable_bet where group_id=? and member_id=? FOR UPDATE', memberBetData); //Locked Table bet_detail
      //console.log(`上鎖表 ${memberData.join()}`);
      const [members] = await connection.execute(
        'SELECT account,pwd, money, money from members WHERE account=?  ORDER BY id', memberData
      ); //查看目前剩餘金額
      const [betDetail] = await connection.execute(
        'SELECT sum(bet_amount) as money from turntable_bet where group_id=? and member_id=?', memberBetData
      ); //查看目前剩餘金額
      //console.log('查看目前剩餘金額');
      //console.log(members[0].money)
      //console.log(betDetail[0].money)

      const finalAmount = Number(betDetail[0].money) + Number(total)
      //console.log(finalAmount)
      if (members[0].money < finalAmount) {//回傳下注失敗超出金額
        throw new Error("超過金額!")
      }

      const InsertBetDetailData = [nowData[0].id, nowtype, total, req.session.userinfo]
      await connection.execute(
        'INSERT INTO turntable_bet (group_id,bet_type,bet_amount,member_id) VALUES (?, ?, ?, ?)',
        InsertBetDetailData
      )
      //console.log(`下注INSERT`);


      await connection.commit();
      const diceBetData = {
        group_id: nowData[0].id,
        bet_type: nowtype,
        bet_amount: total,
        member_id: req.session.userinfo
      }
      return res.json({//回傳成功
        code: 200,
        msg: "下注成功",
        data: diceBetData


      });
    } catch (err) {
      console.log(err.message);
      connection.rollback();
      return res.json({//回傳下注失敗超出金額
        code: 401,
        msg: "下注失敗，超出可下注金額",
        data: ""
      });

    }

    //**************************事務END*************************************** *//

  },
  lotteryDraw: async (req, res) => { //開獎
    console.log("AAA")
    const dice_Historys = await SelectFinalDraw(); //查看最後一次開獎結果
    const data = {
      group_id: dice_Historys[0].id,
      member_id: req.session.userinfo
    }
    const betAmounts = await SelectBetList(data); //下注詳細
    if (betAmounts.length <= 0) {
      return res.json({//回傳成功
        code: 200,
        msg: "最新開獎結果",
        data: [{
          dice: dice_Historys[0].dice,
          betList: "未下注"
        }]
      });
    } else {
      const betList = []
      var betDetail = {}
      var betTypeChanges = ''
      for (i = 0; i < betAmounts.length; i++) {
        detailData = {
          dice: dice_Historys[0].dice,
          nowtype: betAmounts[i].bet_type,
          total: betAmounts[i].bet_amount
        }
        // console.log(doCount(detailData))
        betTypeChanges = betTypeChange(betAmounts[i].bet_type)
        betDetail = {
          bet_type: betTypeChanges.str,//下注類型
          bet_amount: betAmounts[i].bet_amount,//下注金額
          odds: betTypeChanges.odds,
          settlement: doCount(detailData)
        }
        betList.push(betDetail);
      }
      //console.log(betList)
      return res.json({//回傳成功
        code: 200,
        msg: "最新開獎結果",
        data: [{
          dice: dice_Historys[0].dice,
          betList: betList
        }]


      });
    }
  },
  drawHistory: async (req, res) => {
    var historyLists = await drawHistory()
    return res.json({//回傳成功
      code: 200,
      msg: "",
      data: historyLists
    });
  },
  profit: async (req, res) => {
    let page = 1; //預設為1
    if (req.query.page) {
      page = req.query.page;
    }
    const data = {
      page: page,
      member_id: req.session.userinfo
    }
    const countProfits = await countProfit(data)//總數
    const allPages = Math.ceil(countProfits[0].sum / 10) //總頁數
    const profitHistorys = await selectProfit(data)//
    return res.json({//回傳成功
      code: 200,
      msg: "下注紀錄",
      data: [{
        total:allPages,
        list:profitHistorys
    }]
    });
  }
}

function betTypeChange(data) {
  const changeList = [
    { type: 'box0', str: '單格下注 0', odds: '1:35' },
    { type: 'box1', str: '單格下注 1', odds: '1:35' },
    { type: 'box2', str: '單格下注 2', odds: '1:35' },
    { type: 'box3', str: '單格下注 3', odds: '1:35' },
    { type: 'box4', str: '單格下注 4', odds: '1:35' },
    { type: 'box5', str: '單格下注 5', odds: '1:35' },
    { type: 'box6', str: '單格下注 6', odds: '1:35' },
    { type: 'box7', str: '單格下注 7', odds: '1:35' },
    { type: 'box8', str: '單格下注 8', odds: '1:35' },
    { type: 'box9', str: '單格下注 9', odds: '1:35' },
    { type: 'box10', str: '單格下注 10', odds: '1:35' },
    { type: 'box11', str: '單格下注 11', odds: '1:35' },
    { type: 'box12', str: '單格下注 12', odds: '1:35' },
    { type: 'box13', str: '單格下注 13', odds: '1:35' },
    { type: 'box14', str: '單格下注 14', odds: '1:35' },
    { type: 'box15', str: '單格下注 15', odds: '1:35' },
    { type: 'box16', str: '單格下注 16', odds: '1:35' },
    { type: 'box17', str: '單格下注 17', odds: '1:35' },
    { type: 'box18', str: '單格下注 18', odds: '1:35' },
    { type: 'box19', str: '單格下注 19', odds: '1:35' },
    { type: 'box20', str: '單格下注 20', odds: '1:35' },
    { type: 'box21', str: '單格下注 21', odds: '1:35' },
    { type: 'box22', str: '單格下注 22', odds: '1:35' },
    { type: 'box23', str: '單格下注 23', odds: '1:35' },
    { type: 'box24', str: '單格下注 24', odds: '1:35' },
    { type: 'box25', str: '單格下注 25', odds: '1:35' },
    { type: 'box26', str: '單格下注 26', odds: '1:35' },
    { type: 'box27', str: '單格下注 27', odds: '1:35' },
    { type: 'box28', str: '單格下注 28', odds: '1:35' },
    { type: 'box29', str: '單格下注 29', odds: '1:35' },
    { type: 'box30', str: '單格下注 30', odds: '1:35' },
    { type: 'box31', str: '單格下注 31', odds: '1:35' },
    { type: 'box32', str: '單格下注 32', odds: '1:35' },
    { type: 'box33', str: '單格下注 33', odds: '1:35' },
    { type: 'box34', str: '單格下注 34', odds: '1:35' },
    { type: 'box35', str: '單格下注 35', odds: '1:35' },
    { type: 'box36', str: '單格下注 36', odds: '1:35' },
    { type: 'line1', str: '直列', odds: '1:2' },
    { type: 'line2', str: '直列', odds: '1:2' },
    { type: 'line3', str: '直列', odds: '1:2' },
    { type: 'group1', str: '一打1', odds: '1:2' },//1~12
    { type: 'group2', str: '一打2', odds: '1:2' },//13~24
    { type: 'group3', str: '一打3', odds: '1:2' },//25~36
    { type: 'blackbox', str: '黑色', odds: '1:1' },
    { type: 'redbox', str: '紅色', odds: '1:1' },
    { type: 'oddbox', str: '奇數', odds: '1:1' },
    { type: 'evenbox', str: '偶數', odds: '1:1' },
    { type: 'bigbox', str: '大', odds: '1:1' },
    { type: 'smallbox', str: '小', odds: '1:1' }
  ]
  const changRes = _.find(changeList, { type: data });
  return changRes;
}

function selectNowSec() {//查看現在秒數
  let sql = 'SELECT * FROM turntable_history where status="" or status="Open" order by id DESC limit 0,1'
  let dataList = query(sql)
  return dataList
}

function SelectBetData(data) {//計算已下注總額
  let sql = 'SELECT sum(bet_amount) as money FROM turntable_bet where group_id=? and member_id=?'
  let dataList = query(sql, [data.group_id, data.member_id])
  return dataList
}

function SelectMemberData(data) {//查看現在秒數
  let sql = 'SELECT money FROM members where account=?'
  let dataList = query(sql, [data.member_id])
  return dataList
}
function selectProfit(data) {//查看紀錄
  let sql = 'SELECT * FROM turntable_bet where member_id=?  order by id DESC limit 10 offset ' + 10 * (data.page - 1);
  let dataList = query(sql, [data.member_id])
  return dataList
}


function countProfit(data) {//查看紀錄
  let sql = 'SELECT count(*) as sum FROM turntable_bet where member_id=? ';
  let dataList = query(sql, [data.member_id])
  return dataList
}

function SelectFinalDraw() {//查看最後開獎
  let sql = 'select * from turntable_history where status="Close" order by id DESC limit 0,1'
  let dataList = query(sql)
  return dataList
}

function SelectBetList(data) {//查看下注列表
  let sql = 'select * from turntable_bet where group_id=? and member_id=?'
  let dataList = query(sql, [data.group_id, data.member_id])
  return dataList
}

function drawHistory() {//查看現在秒數
  let sql = 'SELECT * FROM turntable_history where status="Close" order by id DESC limit 0,5'
  let dataList = query(sql)
  return dataList
}


module.exports = turntableController;