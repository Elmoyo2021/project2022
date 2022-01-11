const express = require("express")
const router = express.Router()
const mysql = require('mysql2/promise');
const config = require('../config');



router.get('/',async function (req, res, next) {

    await testAdd();
    res.send('OK');

});

async function testAdd() {
    const memberData = ['user001']
    const memberBetData = ['9932', 'user001']
    const total = 500;
    const connection = await mysql.createConnection(config.db);
    await connection.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    console.log('隔離級別設定為交讀');
    await connection.beginTransaction();
    try {
        //SELECT sum(bet_amount) as money FROM bet_detail where group_id=? and member_id=?
        await connection.execute('SELECT name,money FROM members WHERE account=? FOR UPDATE', memberData); //Locked Table member
        await connection.execute('SELECT * FROM bet_detail where group_id=? and member_id=? FOR UPDATE', memberBetData); //Locked Table bet_detail
        console.log(`上鎖表 ${memberData.join()}`);
        const [members] = await connection.execute(
            'SELECT account,pwd, money, money from members WHERE account=?  ORDER BY id', memberData
        ); //查看目前剩餘金額
        const [betDetail] = await connection.execute(
            'SELECT sum(bet_amount) as money from bet_detail where group_id=? and member_id=?', memberBetData
        ); //查看目前剩餘金額
        console.log('查看目前剩餘金額');
        console.log(members[0].money)
        console.log(betDetail[0].money)

        const finalAmount = Number(betDetail[0].money) + Number(total)
        console.log(finalAmount)
        if (members[0].money < finalAmount) {//回傳下注失敗超出金額
            throw new Error("超過金額!")
            return await connection.rollback()
        }

        const nowtype = "oddbox"
        const InsertBetDetailData = ['9932', nowtype, total, 'user001']
        await connection.execute(
            'INSERT INTO bet_detail (group_id,bet_type,bet_amount,member_id) VALUES (?, ?, ?, ?)',
            InsertBetDetailData
        )
        console.log(`Order created`);


        await connection.commit();
    } catch (err) {
        console.log(err.message);
        connection.rollback();
        console.info('Rollback successful');
        return 'error creating order';

    }
}



//setInterval((() => console.log("Hello!")), 1000);
/*
(async function testOrderCreate() {
    console.log(await testAdd());
    // process.exit(0);  //SERVER 
})();
*/



module.exports = router