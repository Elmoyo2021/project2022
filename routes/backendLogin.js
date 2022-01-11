const express = require("express")
const router = express.Router()
const db = require('../conn')
const { query } = require('../async-db')
const { check, validationResult } = require('express-validator')

router.post('/', [
    check('pwd', '密碼必須填寫')
        .isLength({ min: 1 }),
    check('account', '帳號必須填寫')
        .isLength({ min: 1 })
], async function (req, res, next) {
    var account = req.body.account;
    var pwd = req.body.pwd;
    const errors = validationResult(req)
    if (!errors.isEmpty()) {//是否有正確填寫欄位值
        var errorrmsg = errors.array();
        var emsg = "";
        console.log(errorrmsg);
        errorrmsg.forEach(function (erow, i) {//錯誤訊息
            emsg = emsg + erow.msg + " ";
        })
        return res.json({
            code: 401,
            msg: emsg,
            data: ""

        });
    }
    var showthis = await selectAllData(account, pwd)
    if (showthis != "") {
        req.session.adminInfo = account;//儲存  Session
        //res.send(showthis);
        const loginInfo = {
            "name": showthis[0].name,
            "account": showthis[0].account,
        }
        res.json({
            code: 200,
            msg: "登入成功",
            data: loginInfo

        });
        return;
    } else {
        req.session.destroy();//清除Session
        res.json({
            code: 401,
            msg: "帳號密碼錯誤",
            data: ""
        });
        return;
    }

});


function selectAllData(account, pwd) { //查看帳號密碼是否正確
    let sql = 'SELECT * FROM admin_account where account=? and pwd=?'
    let dataList = query(sql, [account, pwd])
    return dataList
}



module.exports = router