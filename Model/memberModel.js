const db = require('../conn')
const { query } = require('../async-db')

const todoModel = {
  register: async (req, res) => {//註冊
    let result = {};
    var showthis = await selectAllData(req.account)
    var errormsg = CheckPost(req, showthis);
    if (errormsg.msg != "") {//判斷是否註冊過或已經確實填寫欄位
      return errormsg;
    } else {
      var InsertCheck = await InsertData(req)
      // 成功回傳：
      //console.log(InsertCheck);
      result.code = 200//狀態
      result.msg = "";
      result.data =req;//註冊資料
      return result;
    }
  }
}

function selectAllData(mdata) {//查看是否已經註冊過
  let sql = 'SELECT * FROM members where account=?'
  let dataList = query(sql, [mdata])
  return dataList
}
function InsertData(mdata) {//寫入會員資料
  let sql = 'INSERT INTO members SET ?'
  let dataList = query(sql, mdata)
  return dataList
}
function CheckPost(mdata, showthis) { //判斷是否註冊過或已經確實填寫欄位
  let result = {};
  if (showthis != "") {
    result.code = 401//狀態
    result.msg = "帳號已註冊!";
    result.date = "";
    return result;
  } else if (mdata.account != '' && mdata.pwd != '' && mdata.name != '' && mdata.email != '') {
    result.msg = "";
    return result;
  } else {
    result.code = 401//狀態
    result.msg = "請確實填寫欄位";
    result.date = "";
    return result;
  }
}
module.exports = todoModel
