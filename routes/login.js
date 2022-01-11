const express = require("express")
const router = express.Router()
const db = require('../conn')
const { query } = require('../async-db')
const { check, validationResult } = require('express-validator')

router.post('/', [
  check('pwd', '密碼必須填寫')
    .exists()
    .isLength({ min: 1 }),
  check('account', '帳號必須填寫')
    .exists()
    .isLength({ min: 1 })
], async function (req, res, next) {
  var account = req.body.account;
  var pwd = req.body.pwd;
  const errors = validationResult(req)
  if (!errors.isEmpty()) {//是否有正確填寫欄位值
    var errorrmsg = errors.array();
    var emsg = "";
    errorrmsg.forEach(function (erow, i) {//錯誤訊息
      emsg = emsg + erow.msg + " ";
    })
    console.log(emsg);
    return res.json({
      code: '401',
      msg: emsg,
      date: ""

    });
  }
  var showthis = await selectAllData(account, pwd)
  if (showthis != "") {
    req.session.userinfo = account;//儲存  Session
    //res.send(showthis);
    const loginInfo = {
      "name": showthis[0].name,
      "account": showthis[0].account,
      "pwd": showthis[0].pwd,
      "email": showthis[0].email,
      "money": showthis[0].money
    }
    res.json({
      code: 200,
      msg: "",
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

function checkpost() {
  check('pwd', '密碼不得為空')
    .exists()
    .isLength({ min: 1 }), check('account', '帳號不得為空')
      .exists()
      .isLength({ min: 1 })
}


function selectAllData(account, pwd) { //查看帳號密碼是否正確
  let sql = 'SELECT * FROM members where account=? and pwd=?'
  let dataList = query(sql, [account, pwd])
  return dataList
}



module.exports = router