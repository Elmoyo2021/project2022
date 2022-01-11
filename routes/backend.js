const express = require("express")
const router = express.Router()
const db = require('../conn')
const { query } = require('../async-db')
const { check, validationResult } = require('express-validator')

const backendController = require("../Controller/backendController")
const authAdmin = require("../authAdmin")//判斷登入狀態及權限

router.get('/memberList', authAdmin.adminRequired, async function (req, res, next) {
    const totals = await selectPages();//總數量
    var skip = 0
    var limit= 10
    var orderBy="id"
    var orderType="ASC"
    if (req.query.skip != '') {
        skip = req.query.skip
    }
    if (req.query.limit != '') {
        limit = req.query.limit
    }
    if (req.query.orderBy != '') {
        orderBy = req.query.orderBy
    }
    if (req.query.orderType != '') {
        orderType = req.query.orderType
    }
    const selectData = {
        skip: skip,
        limit: limit,
        orderBy: orderBy,
        orderType: orderType //每頁數量
    }
    const members = await selectAllData(selectData)
    const total = Math.ceil(Number(totals[0].total) / Number(limit))
    res.json({
        code: 200,
        msg: "搜尋成功",
        data: {
            total: total,
            list: members
        }
    });
    /*}*/


});
router.post('/memberSearch', authAdmin.adminRequired, async function (req, res, next) {
    const searchData = {
        searchType: req.body.searchType,
        searchKey: req.body.searchKey
    }
    const members = await selectOneData(searchData)
    console.log(members)
    if (members != '') {
        res.json({
            code: 200,
            msg: "搜尋成功",
            data: members
        });
    } else {
        res.json({
            code: 200,
            msg: "搜尋失敗，查無相關結果",
            data: ""
        });

    }

});
router.post('/addValue', authAdmin.adminRequired, [
    check('id', 'id為空')
        .isLength({ min: 1 }),
    check('id', 'id必須為數值')
        .isInt(),
    check('transfer_money', '加值金額必須為正整數')
        .isInt(),
    check('account', '帳號必須填寫')
        .isLength({ min: 1 }),
], async function (req, res, next) {
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
    }


    const members_old = await selectMember({ id: req.body.id })
    const memberData = {
        account: req.body.account,
        id: req.body.id,
        money: req.body.transfer_money
    }

    await UpdateMember(memberData)
    const members = await selectMember({ id: req.body.id })//加值完後結果
    const LogData = {
        userid: req.body.id,
        account: req.body.account,
        transfer_money: req.body.transfer_money,
        money_old: members_old[0].money,
        money_final: members[0].money,
        transfer_info: req.body.transfer_info
    }
    await InsertData(LogData)


    res.json({
        code: 200,
        msg: "加值成功",
        data: members
    });
    return;

});

router.post('/rev_exp', backendController.expList);
router.patch('/updateMember', backendController.updateMember);

router.get('/loginCheck', async function (req, res, next) {//登入狀態確認
    const data = {
        account: req.session.adminInfo
    }
    const backends = await checkBackend(data)
    if (backends.length <= 0) {
        req.session.destroy();//清除Session
        return res.json({
            code: 401,
            msg: "尚未登入",
            data: ""
        });
    } else {
        const datas = {
            id: backends[0].id,
            account: backends[0].account,
            name: backends[0].name
        }
        return res.json({
            code: 200,
            msg: "登入中",
            data: datas
        });
    }

});
router.get('/out', async function (req, res, next) {

    req.session.destroy();//清除Session
    return res.json({
        code: 200,
        msg: "登出成功",
        data: ""
    });

});


router.get('/add_log', async function (req, res, next) {
    const pages = 1
    if (req.query.page != "") {
        pages = req.query.page
    }
    const add_logs = await selectAddLog({ page: pages })//加值完後結果
    const logsTotals = await selectLogTotal()
    const total = Math.ceil(Number(logsTotals[0].total) / 10)
    res.json({
        code: 200,
        msg: "搜尋成功",
        data: {
            total: total,
            list: add_logs
        }
    });
    return;
});

function selectOneData(data) {//查看會員
    console.log(data)
    if (data.searchType == "act") {
        let sql = 'SELECT id,account,name,email,money FROM members where account = ?'
        let dataList = query(sql, [data.searchKey])
        return dataList
    } else if (data.searchType == "name") {
        let sql = 'SELECT id,account,name,email,money FROM members where name = ?'
        let dataList = query(sql, [data.searchKey])
        return dataList
    } else if (data.searchType == "email") {
        let sql = 'SELECT id,account,name,email,money FROM members where email = ?'
        let dataList = query(sql, [data.searchKey])
        return dataList
    } else {
        return ""
    }
}
function selectPages() {//
    let sql = 'SELECT count(*) as total FROM members order by id DESC'
    let dataList = query(sql)
    return dataList
}
function selectAllData(data) {//查看會員
    let sql = 'SELECT id,account,name,email,money FROM members order by ' + data.orderBy + ' ' + data.orderType + ' limit ?,?'
    let dataList = query(sql, [Number(data.skip), Number(data.limit)])
    return dataList
}
function InsertData(mdata) {//寫入LOG
    let sql = 'INSERT INTO addvalue_log SET ?'
    let dataList = query(sql, mdata)
    return dataList
}

function selectMember(mdata) {//查看會員
    let sql = 'SELECT id,account,name,money FROM members where id=?'
    let dataList = query(sql, [mdata.id])
    return dataList
}

function checkBackend(data) {//查看後臺帳號
    let sql = 'SELECT * FROM admin_account where account=?'
    let dataList = query(sql, [data.account])
    return dataList
}
function UpdateMember(data) {//更新
    let sql = 'UPDATE members SET money=money+? where account=? and id=?'
    let dataList = query(sql, [data.money, data.account, data.id])
    return dataList
}


function selectExp(data) {//賺與虧
    //let sql = 'SELECT sum(money) as price,group_id FROM `bet_history` group by group_id limit 5 offset '+5 * (current_page - 1);
    let sql = 'SELECT member_id,sum(money) as price FROM `bet_history` group by group_id limit 10 offset ' + 10 * (data.page - 1);
    let dataList = query(sql)
    return dataList
}


function selectExpTotal(data) {//總筆數
    let sql = 'select count(b.id) as total from (SELECT id,sum(money) as price FROM `bet_history` group by group_id) as b';
    let dataList = query(sql)
    return dataList
}

function selectAddLog(data) {//賺與虧
    let sql = 'SELECT * FROM `addvalue_log` order by id DESC limit 10 offset ' + 10 * (data.page - 1);
    let dataList = query(sql)
    return dataList
}

function selectLogTotal() {//總筆數
    let sql = 'select count(*) as total from addvalue_log';
    let dataList = query(sql)
    return dataList
}
module.exports = router