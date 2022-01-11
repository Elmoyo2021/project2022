var express = require('express');
var router = express.Router();
const RollController = require("../Controller/rollController")
const authUser = require("../authUser")//判斷登入狀態及權限
const schedule = require("node-schedule")
const { query } = require('../async-db')

var _ = require('lodash');


var rule = new schedule.RecurrenceRule();



router.get('/roll', authUser.userRequired, RollController.get);//開講狀態
router.get('/rollHistory', authUser.userRequired, RollController.rollHistory);//開講狀態
//router.get('/rolldo', authUser.userRequired, RollController.calculate);//計算籌碼
router.post('/bet', authUser.userRequired, RollController.bet);//下注
router.get('/profit', authUser.userRequired, RollController.profit);//下注
router.get('/lotteryDraw', authUser.userRequired, RollController.lotteryDraw);//開獎


var countTime = 35;
async function CheckNowTime() {


  countTime--;
  if (countTime >= 5) {
    //console.log("[骰寶]"+countTime)
    var finalData = await selectFinalData()
    if(finalData.length<=0){
    //結束一筆開獎結果過後 新增一筆 START
    var dataInsert = {//開獎結果寫入資料庫
      dice: ""
    }
    await InsertData(dataInsert)//寫入資料庫
    // 新增一筆 END
    finalData = await selectFinalData()
    }
    
    var dice1 = getRandom(6);//骰子1
    var dice2 = getRandom(6);//骰子2
    var dice3 = getRandom(6);//骰子3
    const diceData = {
      dice: dice1 + "," + dice2 + "," + dice3,
      status: "Open",
      sec: countTime - 5,
      id: finalData[0].id
    }
    if (countTime == 15) { //更新狀態禁止下注
      //console.log("[骰寶]目前禁止下注");
    }

    if (countTime == 5) { //更新開獎結果
      //countTime = 35;
      await UpdateData(diceData)//更新開獎結果
     // console.log("[骰寶]開獎")
      const diceStatusData = {
        group_id: finalData[0].id,
        dice: dice1 + "," + dice2 + "," + dice3
      }
      //console.log(diceStatusData)
      await CountFinal(diceStatusData)//結算所有下注
    }
    await UpdateDataSec(diceData)//更新秒數
  } else {
    //console.log("[骰寶]下一局準備開始 " + countTime)
  }


  if (countTime == 0) {
    var finalDataStatus = await selectFinalData2()
    countTime = 35;
    const diceDataStatus = {
      status: "Close",
      id: finalDataStatus[0].id
    }
    await UpdateDataStatus(diceDataStatus)//更新開獎狀態
    

  }

};


setInterval(CheckNowTime, 1000);




async function CountFinal(data) {
  // 結算開獎START
  /* 
  const data = {
    group_id: 1,
    dice: "6,6,6"
  }*/
  var dataList = await selectDetail(data)

  var detail_data = ""
  var member_data = ""
  var finalTotal = 0;
  dataList.forEach(async function (dataShow) {//計算此次下注結果

    detailData = {
      dice: data.dice,
      nowtype: dataShow.bet_type,
      total: dataShow.bet_amount
    }
    // console.log(detail_data)
    finalTotal = await  doCount(detailData);//計算下注及獲利金額

    UpdateMemberData = {
      money: finalTotal,
      member_id: dataShow.member_id
    }

    await UpdateMember(UpdateMemberData);
    //console.log("獲利金額:" + finalTotal);
    UpdateMemberData = {
      money: finalTotal,
      member_id: dataShow.member_id
    }
    var BetHistory = {
      group_id: data.group_id,
      bet_type: dataShow.bet_type,
      dice: data.dice,
      money: finalTotal,
      member_id: dataShow.member_id
    }
    await InsertBetHistory(BetHistory);
  });

  const Satusdata = {
    group_id: data.group_id,
    status: "finsh"
  }
  UpdateBetStatus(Satusdata)//更新計算結束狀態
  //res.send(dataList);


  // 結算開獎END
}

function UpdateData(data) {//更新
  let sql = 'UPDATE dice_history SET dice=?,status=? where id=?'
  let dataList = query(sql, [data.dice, data.status, data.id])
  return dataList
}

function UpdateDataStatus(data) {//更新
  let sql = 'UPDATE dice_history SET status=? where id=?'
  let dataList = query(sql, [data.status, data.id])
  return dataList
}


function UpdateDataSec(data) {//更新目前秒數
  let sql = 'UPDATE dice_history SET sec=? where id=?'
  let dataList = query(sql, [data.sec, data.id])
  return dataList
}
async function InsertBetHistory(data) {
  //console.log("A")
  let sql = 'INSERT INTO bet_history SET ?'
  let dataList = await query(sql, data)
  return dataList

}
async function InsertData(data) {//寫入
  let sql = 'INSERT INTO dice_history SET ?'
  let dataList =await query(sql, data)
  return dataList
}

async function selectFinalData() {//查詢最後一筆
  let sql = "SELECT * FROM dice_history  where dice='' order by id DESC limit 0,1"
  let dataList = await query(sql)
    return dataList
  
}

function selectFinalData2() {//查詢最後一筆開獎中
  let sql = "SELECT id FROM dice_history  where status='Open' order by id DESC limit 0,1"
  let dataList = query(sql)
  return dataList
}


function getRandom(x) { //亂數產生
  return Math.floor(Math.random() * x) + 1;
};




function selectDetail(data) {//查看未結算列表
  let sql = "SELECT * FROM bet_detail  where group_id=? and status='' order by member_id"
  let dataList = query(sql, [data.group_id])
  return dataList
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




function UpdateMember(data) {//更新
  let sql = 'UPDATE members SET money=money+? where account=?'
  let dataList = query(sql, [data.money, data.member_id])
  return dataList
}

function UpdateBetStatus(data) {//更新
  let sql = 'UPDATE bet_detail SET status=? where group_id=?'
  let dataList = query(sql, [data.status, data.group_id])
  return dataList
}
module.exports = router