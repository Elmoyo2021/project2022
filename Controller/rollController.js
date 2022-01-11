//const memberModel = require('../Model/memberModel');  // 引入 model
const db = require('../conn')
const { query } = require('../async-db')
const authUser = require("../authUser")//判斷登入狀態及權限
var _ = require('lodash');


const mysql = require('mysql2/promise');
const config = require('../config');

const RollController = {
  get: async (req, res) => {
    var nowSec = await selectNowSec()
    var remsg = nowSec[0].sec
    if (nowSec[0].sec <= 15 && nowSec[0].sec > 0) {
      remsg = nowSec[0].sec + " 秒後即將開獎，禁止下注"
      return res.json({//回傳成功
        code: 200,
        msg: "",
        data: remsg
      });
    } else if (nowSec[0].sec == 0) {
      return res.json({//回傳成功
        code: 200,
        msg: "",
        data: "開獎結果:" + nowSec[0].dice
      });
    } else {
      return res.json({//回傳成功
        code: 200,
        msg: "",
        data: "距離下次開獎 " + remsg + " 秒"
      });
    }
  },
  rollHistory: async (req, res) => {
    var historyList = await diceHistory()
    console.log(historyList)
    return res.json({//回傳成功
      code: 200,
      msg: "",
      data: historyList
    });
  },
  bet: async (req, res) => {
    const nowtype = req.body.bet_type
    const total = req.body.bet_amount
    const nowData = await selectNowSec()
    const nowSec = nowData[0].sec
    if (nowSec<=10){
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
      await connection.execute('SELECT * FROM bet_detail where group_id=? and member_id=? FOR UPDATE', memberBetData); //Locked Table bet_detail
      //console.log(`上鎖表 ${memberData.join()}`);
      const [members] = await connection.execute(
        'SELECT account,pwd, money, money from members WHERE account=?  ORDER BY id', memberData
      ); //查看目前剩餘金額
      const [betDetail] = await connection.execute(
        'SELECT sum(bet_amount) as money from bet_detail where group_id=? and member_id=?', memberBetData
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
        'INSERT INTO bet_detail (group_id,bet_type,bet_amount,member_id) VALUES (?, ?, ?, ?)',
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
  profit: async (req, res) => {
    let page = 1; //預設為1
    if (req.query.page) {
      page = req.query.page;
    }
    const data = {
      page: page,
      member_id: req.session.userinfo
    }
    const profitHistory = await selectProfit(data)//

    const countProfits = await countProfit(data)//總數
    const allPages = Math.ceil(countProfits[0].sum / 10) //總頁數
    const betList = []
    var betDetail = {}
    var betTypeChanges = ''
    for (i = 0; i < profitHistory.length; i++) {
      detailData = {
        dice: profitHistory[i].dice,
        nowtype: profitHistory[i].bet_type,
        total: profitHistory[i].money
      }
      // console.log(doCount(detailData))
      betTypeChanges = betTypeChange(profitHistory[i].bet_type)
      betDetail = {
        dice: profitHistory[i].dice,//下注類型
        bet_type: betTypeChanges.str,//下注類型
        odds: betTypeChanges.odds,
        money: profitHistory[i].money//下注金額
      }
      betList.push(betDetail);
    }


    return res.json({//回傳成功
      code: 200,
      msg: "下注盈虧紀錄",
      data: [{
        total: allPages,
        list:betList}]


    });
  },
  lotteryDraw: async (req, res) => {//查看最後開獎結果
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
  }
}

function betTypeChange(data) {
  const changeList = [
    { type: 'oddbox', str: '奇數', odds: '1:1' },
    { type: 'bowz1', str: '豹子 1', odds: '1:150' },
    { type: 'bowz2', str: '豹子 2', odds: '1:150' },
    { type: 'bowz3', str: '豹子 3', odds: '1:150' },
    { type: 'bowz4', str: '豹子 4', odds: '1:150' },
    { type: 'bowz5', str: '豹子 5', odds: '1:150' },
    { type: 'bowz6', str: '豹子 6', odds: '1:150' },
    { type: 'bowzAll', str: '任一豹子', odds: '1:24' },
    { type: 'dicebox1', str: '骰子點數含有1 ', odds: '1:1' },
    { type: 'dicebox2', str: '骰子點數含有點數2', odds: '1:1' },
    { type: 'dicebox3', str: '骰子點數含有點數3', odds: '1:1' },
    { type: 'dicebox4', str: '骰子點數含有點數4', odds: '1:1' },
    { type: 'dicebox5', str: '骰子點數含有點數5', odds: '1:1' },
    { type: 'dicebox6', str: '骰子點數含有點數6', odds: '1:1' },
    { type: 'dicebox6', str: '骰子點數總和4', odds: '1:50' },
    { type: 'dicebox6', str: '骰子點數總和5', odds: '1:18' },
    { type: 'dicebox6', str: '骰子點數總和6', odds: '1:14' },
    { type: 'dicebox6', str: '骰子點數總和7', odds: '1:12' },
    { type: 'dicebox6', str: '骰子點數總和8', odds: '1:8' },
    { type: 'dicebox6', str: '骰子點數總和9', odds: '1:6' },
    { type: 'dicebox6', str: '骰子點數總和10', odds: '1:6' },
    { type: 'dicebox6', str: '骰子點數總和11', odds: '1:6' },
    { type: 'dicebox6', str: '骰子點數總和12', odds: '1:6' },
    { type: 'dicebox6', str: '骰子點數總和13', odds: '1:8' },
    { type: 'dicebox6', str: '骰子點數總和14', odds: '1:12' },
    { type: 'dicebox6', str: '骰子點數總和15', odds: '1:14' },
    { type: 'dicebox6', str: '骰子點數總和16', odds: '1:18' },
    { type: 'dicebox6', str: '骰子點數總和17', odds: '1:50' },
    { type: 'oddbox', str: '奇數', odds: '1:1' },
    { type: 'evenbox', str: '偶數', odds: '1:1' },
    { type: 'bigbox', str: '大', odds: '1:1' },
    { type: 'smallbox', str: '小', odds: '1:1' }
  ]
  const changRes = _.find(changeList, { type: data });
  return changRes;
}

function getRandom(x) { //亂數產生
  return Math.floor(Math.random() * x) + 1;
};

function InsertData(data) {//寫入
  let sql = 'INSERT INTO bet_detail SET ?'
  let dataList = query(sql, data)
  return dataList
}

function selectNowSec() {//查看現在秒數
  let sql = 'SELECT * FROM dice_history where status="" or status="Open" order by id DESC limit 0,1'
  let dataList = query(sql)
  return dataList
}

function SelectBetData(data) {//查看現在秒數
  let sql = 'SELECT sum(bet_amount) as money FROM bet_detail where group_id=? and member_id=?'
  let dataList = query(sql, [data.group_id, data.member_id])
  return dataList
}

function SelectMemberData(data) {//查看現在秒數
  let sql = 'SELECT money FROM members where account=?'
  let dataList = query(sql, [data.member_id])
  return dataList
}
function selectProfit(data) {//查看紀錄
  let sql = 'SELECT * FROM bet_history where member_id=?  order by sdate DESC limit 10 offset ' + 10 * (data.page - 1);
  let dataList = query(sql, [data.member_id])
  return dataList
}

function countProfit(data) {//查看紀錄
  let sql = 'SELECT count(*) as sum FROM bet_history where member_id=? ';
  let dataList = query(sql, [data.member_id])
  return dataList
}

function getOpenDice() {//取得開講骰子
  let sql = 'SELECT * FROM dice_history where status="Close" order by id DESC limit 0,1'
  //let sql = 'SELECT * FROM dice_history where status="Open" order by id DESC limit 0,1'
  let dataList = query(sql)
  return dataList
}


function diceHistory() {//取得開講骰子
  let sql = 'SELECT * FROM dice_history where status="Close" order by id DESC limit 0,3'
  let dataList = query(sql)
  return dataList
}

function SelectFinalDraw() {//查看最後開獎
  let sql = 'select * from dice_history where status="Close" order by id DESC limit 0,1'
  let dataList = query(sql)
  return dataList
}

function SelectBetList(data) {//查看下注列表
  let sql = 'select * from bet_detail where group_id=? and member_id=?'
  let dataList = query(sql, [data.group_id, data.member_id])
  return dataList
}

function SumData(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  };
  return sum;
}




function doCount(data) {//計算金額
  var nowtype = data.nowtype//下注欄位
  var downtotal = data.total//下注金額
  var diceAll = _.split(data.dice, ',')///拆骰子
  var dice1 = diceAll[0];//骰子1
  var dice2 = diceAll[1];//骰子2
  var dice3 = diceAll[2];//骰子3
  var dicetotal = Number(dice1) + Number(dice2) + Number(dice3) //總和
  var dicehson = [
    { 'dice': dice1 },
    { 'dice': dice2 },
    { 'dice': dice3 }
  ];
  var gettotal = 0//獲利金額
  var finaltotal = 0 //最終結果

  //點數總和下注區_START
  /*
  const boxAreas = [
    { type: 'box4', diceTotal: 4, rate: 50 },
    { type: 'box5', diceTotal: 5, rate: 18 },
    { type: 'box6', diceTotal: 6, rate: 14 },
    { type: 'box7', diceTotal: 7, rate: 12 },
    { type: 'box8', diceTotal: 8, rate: 8 },
    { type: 'box9', diceTotal: 9, rate: 6 },
    { type: 'box10', diceTotal: 10, rate: 6 },
    { type: 'box11', diceTotal: 11, rate: 6 },
    { type: 'box12', diceTotal: 12, rate: 6 },
    { type: 'box13', diceTotal: 13, rate: 8 },
    { type: 'box14', diceTotal: 14, rate: 12 },
    { type: 'box15', diceTotal: 15, rate: 14 },
    { type: 'box16', diceTotal: 16, rate: 18 },
    { type: 'box17', diceTotal: 17, rate: 50 }
  ]

  const boxArea = _.find(boxAreas, { 'type': nowtype, 'diceTotal': 6 });
  console.log(boxArea.rate)
  if (boxArea != '') {
    //gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * area.rate
  }

  */



  if (nowtype == "box4" && dicetotal == 4) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 50
  }
  if (nowtype == "box5" && dicetotal == 5) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 18
  }
  if (nowtype == "box6" && dicetotal == 6) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 14
  }
  if (nowtype == "box7" && dicetotal == 7) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 12
  }
  if (nowtype == "box8" && dicetotal == 8) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 8
  }
  if (nowtype == "box9" && dicetotal == 9) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 6
  }
  if (nowtype == "box10" && dicetotal == 10) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 6
  }
  if (nowtype == "box11" && dicetotal == 11) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 6
  }
  if (nowtype == "box12" && dicetotal == 12) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 6
  }
  if (nowtype == "box13" && dicetotal == 13) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 8
  }
  if (nowtype == "box14" && dicetotal == 14) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 12
  }
  if (nowtype == "box15" && dicetotal == 15) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 14
  }
  if (nowtype == "box16" && dicetotal == 16) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 18
  }
  if (nowtype == "box17" && dicetotal == 17) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 50
  }

  //點數總和下注區_END

  //豹子下注區_START
  var check_bowz1 = _.filter(dicehson, { 'dice': '1' });
  var check_bowz2 = _.filter(dicehson, { 'dice': '2' });
  var check_bowz3 = _.filter(dicehson, { 'dice': '3' });
  var check_bowz4 = _.filter(dicehson, { 'dice': '4' });
  var check_bowz5 = _.filter(dicehson, { 'dice': '5' });
  var check_bowz6 = _.filter(dicehson, { 'dice': '6' });
  if (nowtype == "boz1" && check_bowz1.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "boz2" && check_bowz2.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "boz3" && check_bowz3.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "boz4" && check_bowz4.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "boz5" && check_bowz5.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "boz6" && check_bowz6.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  //豹子下注區_END
  //豹子下注區_START
  if (nowtype == "bowz1" && check_bowz1.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "bowz2" && check_bowz2.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "bowz3" && check_bowz3.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "bowz4" && check_bowz4.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "bowz5" && check_bowz5.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
  }
  if (nowtype == "bowz6" && check_bowz6.length == 3) {
    gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 150
    //console.log(gettotal)
  }
  //豹子下注區_END
  if (nowtype == "bowzAll") {
    if (check_bowz1.length == 3 || check_bowz2.length == 3 || check_bowz3.length == 3 || check_bowz4.length == 3 || check_bowz5.length == 3 || check_bowz6.length == 3) {
      gettotal = Number(gettotal) + Number(downtotal) + Number(downtotal) * 24
    }
  }


  //單骰點子下注區_START
  if (nowtype == "dicebox1" && diceAll.includes('1') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "dicebox2" && diceAll.includes('2') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "dicebox3" && diceAll.includes('3') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "dicebox4" && diceAll.includes('4') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "dicebox5" && diceAll.includes('5') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "dicebox6" && diceAll.includes('6') == true) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  //單骰點子下注區_END

  //大小下注區_START
  if (nowtype == "bigbox" && dicetotal >= 11) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "smallbox" && dicetotal <= 10) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  //大小下注區_END

  //單雙下注區_START
  if (nowtype == "oddbox" && dicetotal % 2 != 0) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  if (nowtype == "evenbox" && dicetotal % 2 == 0) {
    gettotal = Number(gettotal) + Number(downtotal) * 2
  }
  finaltotal = Number(downtotal) - Number(gettotal);
  finaltotal = 0 - Number(finaltotal)
  //單雙下注區_END
  /*
  console.log("Dice:" + data.dice);
  console.log("賺:" + gettotal);
  console.log("下注金額:" + downtotal);
  console.log("最終結果:" + finaltotal);*/
  return finaltotal
}


module.exports = RollController;