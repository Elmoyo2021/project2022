const express = require("express")
const router = express.Router()
const authUser = require("../authUser")//判斷登入狀態及權限
const { check, validationResult } = require('express-validator')//驗證欄位
const { query } = require('../async-db')
const turntableController = require("../Controller/turntableController")
var _ = require('lodash');
router.get('/', async function (req, res, next) {//轉盤開獎
    var dice1 = getRandom(36);//隨機開獎
    return res.json({
        code: 200,
        msg: "成功",
        data: dice1
    });

});

router.post('/bet', authUser.userRequired, turntableController.bet);//下注
router.get('/lotteryDraw', authUser.userRequired, turntableController.lotteryDraw);//開獎
router.get('/drawHistory', authUser.userRequired, turntableController.drawHistory);//開講狀態
router.get('/profit', authUser.userRequired, turntableController.profit);//下注紀錄





setInterval(CheckNowTime, 1000);


var countTime = 35;
async function CheckNowTime() {


    countTime--;
    if (countTime >= 5) {
        //console.log("[賭盤轉]" + countTime)
        var finalData = await selectFinalData()
        if (finalData.length <= 0) {
            //結束一筆開獎結果過後 新增一筆 START
            var dataInsert = {//開獎結果寫入資料庫
                dice: ""
            }
            await InsertData(dataInsert)//寫入資料庫
            // 新增一筆 END
            finalData = await selectFinalData()
        }

        var dices = getRandom(36);//隨機開獎
        const diceData = {
            dice: dices,
            status: "Open",
            sec: countTime - 5,
            id: finalData[0].id
        }
        if (countTime == 10) { //更新狀態禁止下注
         //   console.log("[賭盤轉]目前禁止下注");
        }

        if (countTime == 5) { //更新開獎結果
            //countTime = 35;
            await UpdateData(diceData)//更新開獎結果
            //console.log("[賭盤轉]開獎 : " + dices)
            const diceStatusData = {
                group_id: finalData[0].id,
                dice: dices
            }
            CountFinal(diceStatusData)//結算所有下注
        }
        await UpdateDataSec(diceData)//更新秒數
    } else {
       // console.log("[賭盤轉]下一局準備開始 " + countTime)
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

async function CountFinal(data) {
    // 結算開獎START
    var BetLists = await BetList(data)

    var detail_data = ""
    var member_data = ""
    var finalTotal = 0;
    BetLists.forEach(async function (BetDetails) {//計算此回合下注結果

        detailData = {
            dice: data.dice,
            bet_type: BetDetails.bet_type,
            bet_amount: BetDetails.bet_amount
        }
        finalTotal = await doCount(detailData);//計算下注及獲利金額

        UpdateMemberData = {
            money: finalTotal,
            member_id: BetDetails.member_id
        }

        await UpdateMember(UpdateMemberData);
        var UpdateBetData = {
            status: "finsh",
            id: BetDetails.id,
            money: finalTotal,
            dice: data.dice
        }
        await UpdateBet(UpdateBetData);
    });


    // 結算開獎END
}


async function selectFinalData() {//查詢最後一筆
    let sql = "SELECT * FROM turntable_history  where dice='' order by id DESC limit 0,1"
    let dataList = await query(sql)
    return dataList
}
async function selectFinalData2() {//查詢最後一筆開獎中
    let sql = "SELECT id FROM turntable_history  where status='Open' order by id DESC limit 0,1"
    let dataList = await query(sql)
    return dataList
}
async function InsertData(data) {//寫入
    let sql = 'INSERT INTO turntable_history SET ?'
    let dataList = await query(sql, data)
    return dataList
}
async function UpdateMember(data) {//更新
    let sql = 'UPDATE members SET money=money+? where account=?'
    let dataList = await query(sql, [data.money, data.member_id])
    return dataList
}
function UpdateData(data) {//更新
    let sql = 'UPDATE turntable_history SET dice=?,status=? where id=?'
    let dataList = query(sql, [data.dice, data.status, data.id])
    return dataList
}
function UpdateDataSec(data) {//更新目前秒數
    let sql = 'UPDATE turntable_history SET sec=? where id=?'
    let dataList = query(sql, [data.sec, data.id])
    return dataList
}
function UpdateDataStatus(data) {//更新
    let sql = 'UPDATE turntable_history SET status=? where id=?'
    let dataList = query(sql, [data.status, data.id])
    return dataList
}

function BetList(data) {//查看未結算列表
    let sql = "SELECT * FROM turntable_bet  where group_id=? and status='' order by member_id"
    let dataList = query(sql, [data.group_id])
    return dataList
}
function doCount(data) {//計算金額
    const bet_type = data.bet_type//下注欄位
    const bet_amount = data.bet_amount//下注金額
    const dice = data.dice //骰子格數

    var getPrice = 0//獲利金額
    var finalPrice = 0 //最終結果


    const changeList = [
        { type: 'box0', str: '單格下注 0', odds: '35' },
        { type: 'box1', str: '單格下注 1', odds: '35' },
        { type: 'box2', str: '單格下注 2', odds: '35' },
        { type: 'box3', str: '單格下注 3', odds: '35' },
        { type: 'box4', str: '單格下注 4', odds: '35' },
        { type: 'box5', str: '單格下注 5', odds: '35' },
        { type: 'box6', str: '單格下注 6', odds: '35' },
        { type: 'box7', str: '單格下注 7', odds: '35' },
        { type: 'box8', str: '單格下注 8', odds: '35' },
        { type: 'box9', str: '單格下注 9', odds: '35' },
        { type: 'box10', str: '單格下注 10', odds: '35' },
        { type: 'box11', str: '單格下注 11', odds: '35' },
        { type: 'box12', str: '單格下注 12', odds: '35' },
        { type: 'box13', str: '單格下注 13', odds: '35' },
        { type: 'box14', str: '單格下注 14', odds: '35' },
        { type: 'box15', str: '單格下注 15', odds: '35' },
        { type: 'box16', str: '單格下注 16', odds: '35' },
        { type: 'box17', str: '單格下注 17', odds: '35' },
        { type: 'box18', str: '單格下注 18', odds: '35' },
        { type: 'box19', str: '單格下注 19', odds: '35' },
        { type: 'box20', str: '單格下注 20', odds: '35' },
        { type: 'box21', str: '單格下注 21', odds: '35' },
        { type: 'box22', str: '單格下注 22', odds: '35' },
        { type: 'box23', str: '單格下注 23', odds: '35' },
        { type: 'box24', str: '單格下注 24', odds: '35' },
        { type: 'box25', str: '單格下注 25', odds: '35' },
        { type: 'box26', str: '單格下注 26', odds: '35' },
        { type: 'box27', str: '單格下注 27', odds: '35' },
        { type: 'box28', str: '單格下注 28', odds: '35' },
        { type: 'box29', str: '單格下注 29', odds: '35' },
        { type: 'box30', str: '單格下注 30', odds: '35' },
        { type: 'box31', str: '單格下注 31', odds: '35' },
        { type: 'box32', str: '單格下注 32', odds: '35' },
        { type: 'box33', str: '單格下注 33', odds: '35' },
        { type: 'box34', str: '單格下注 34', odds: '35' },
        { type: 'box35', str: '單格下注 35', odds: '35' },
        { type: 'box36', str: '單格下注 36', odds: '35' },
        { type: 'line1', str: '直列', odds: '2' },//1,4,7,10,13,16,19,22,25,28,31,34
        { type: 'line2', str: '直列', odds: '2' },//2,5,8,11,14,17,20,23,26,29,32,35
        { type: 'line3', str: '直列', odds: '2' },//3,6,9,12,15,18,21,24,27,30,33,36
        { type: 'group1', str: '一打1~12', odds: '2' },//1~12
        { type: 'group2', str: '一打13~24', odds: '2' },//13~24
        { type: 'group3', str: '一打25~336', odds: '2' },//25~36
        { type: 'blackbox', str: '黑色', odds: '1' },
        { type: 'redbox', str: '紅色', odds: '1' },
        { type: 'oddbox', str: '奇數', odds: '1' },
        { type: 'evenbox', str: '偶數', odds: '1' },
        { type: 'bigbox', str: '大', odds: '1' },
        { type: 'smallbox', str: '小', odds: 1 }
    ]

    var boxArea = _.find(changeList, { "type": bet_type });//獲取賠率
    var typeStr = ""

    for (i = 0; i <= 36; i++) {//單格下注計算
        typeStr = "box" + i
        if (bet_type == typeStr && dice == i) {
            getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
        }
    }
    const line1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]//直列
    const line2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
    const line3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]

    const group1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const group2 = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    const group3 = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]

    const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 7, 30, 32, 34, 36]
    const black = [, 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

    if (bet_type == "line1" && line1.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }

    if (bet_type == "line2" && line2.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }

    if (bet_type == "line3" && line3.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }

    if (bet_type == "group1" && group1.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    if (bet_type == "group2" && group2.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    if (bet_type == "group3" && group3.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }

    if (bet_type == "redbox" && red.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    if (bet_type == "blackbox" && black.indexOf(dice) != -1) {
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }

    if (bet_type == "oddbox" && dice % 2 != 0) { //單
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    if (bet_type == "evenbox" && dice % 2 == 0) { //雙
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }


    if (bet_type == "bigbox" && dice >= 19) { //大
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    if (bet_type == "smallbox" && dice >= 1 && dice <= 18) { //小
        getPrice = Number(getPrice) + Number(bet_amount) + Number(bet_amount) * Number(boxArea.odds)
    }
    finalPrice = Number(bet_amount) - Number(getPrice);
    finalPrice = 0 - Number(finalPrice)
    return finalPrice;
}

function UpdateBet(data) {//更新下注
    let sql = 'UPDATE turntable_bet SET status=?,money=?,dice=? where id=?'
    let dataList = query(sql, [data.status, data.money,data.dice, data.id])
    return dataList
}


function getRandom(x) { //亂數產生
    return Math.floor(Math.random() * x);
};
module.exports = router