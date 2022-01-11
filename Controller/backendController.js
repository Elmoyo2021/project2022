//const memberModel = require('../Model/memberModel');  // 引入 model
const db = require('../conn')
const { query } = require('../async-db')
const authUser = require("../authUser")//判斷登入狀態及權限
var _ = require('lodash');
const mysql = require('mysql2/promise');
const config = require('../config');

const backendController = {
  expList: async (req, res) => {
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
      skip: skip,
      limit: limit,
      orderBy: orderBy,
      orderType: orderType //每頁數量
    }
    const expList = await selectExp(selectData);
    const totals = await selectExpTotal();
    const allPages = Math.ceil(totals[0].total / limit) //總頁數
    return res.json({//回傳成功
      code: 200,
      msg: "搜尋成功",
      totalPage: allPages,
      data: expList
    });
  }
  ,
  updateMember: async (req, res) => {
    const data = {
      id: req.body.id,
      name: req.body.name,
      email: req.body.email,
      account: req.body.account
    }
    const UpdateMembers = await UpdateMember(data)
    const Members = await selectAllData(data)
    if (Members!=''){
    return res.json({//回傳成功
      code: 200,
      msg: "修改成功",
      data: Members
    });
    } else {
      return res.json({//回傳成功
        code: 401,
        msg: "修改失敗",
        data: ""
      });

    }
  }
}





function selectAllData(data) {//查看會員
  let sql = 'SELECT id,account,name,email FROM members where account = ?'
  let dataList = query(sql, [data.account])
  return dataList
}

function selectMember(mdata) {//查看會員
  let sql = 'SELECT id,account,name,money FROM members where id=?'
  let dataList = query(sql, [mdata.id])
  return dataList
}

function UpdateMember(data) {//更新
  let sql = 'UPDATE members SET name=?,email=? where account=? and id=?'
  let dataList = query(sql, [data.name, data.email,data.account, data.id])
  return dataList
}


function selectExp(data) {//賺與虧
  //let sql = 'SELECT sum(money) as price,group_id FROM `bet_history` group by group_id limit 5 offset '+5 * (current_page - 1);
  console.log(data)
  let sql = 'SELECT id,member_id as account,sum(money) as money,sdate FROM `bet_history` group by group_id order by ' + data.orderBy + ' ' + data.orderType + ' limit ?,?'
  let dataList = query(sql,[Number(data.skip), Number(data.limit)])
  return dataList
}

function selectExpTotal() {//總筆數
  let sql = 'select count(b.id) as total from (SELECT id,sum(money) as price FROM `bet_history` group by group_id) as b';
  let dataList = query(sql)
  return dataList
}

module.exports = backendController;