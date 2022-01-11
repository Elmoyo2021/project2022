const express = require("express")
const router = express.Router()
const controller = require("../Controller/memberController")
const authUser = require("../authUser")//判斷登入狀態及權限
const { check, validationResult } = require('express-validator')//驗證欄位

router.post('/register', [//會員註冊
    check('pwd', '密碼必須大於6碼')
        .exists()
        .isLength({ min: 6 }),
    check('account', '帳號必須填寫')
        .exists()
        .isLength({ min: 1 }),
    check('name', '姓名必須填寫')
        .exists()
        .isLength({ min: 1 }),
    check('email', '信箱格式錯誤')
        .exists()
        .isEmail()
], controller.post);

router.post('/search', authUser.userRequired, controller.getall);
router.post('/checkMember', authUser.userRequired, controller.checkMember);
router.post('/withdrawal', authUser.userRequired, controller.withdrawal);
router.get('/withdrawal_list', authUser.userRequired, controller.withdrawal_list);
router.patch('/update', authUser.userRequired, [//會員資料修改
    check('name', '姓名必須填寫')
        .exists()
        .isLength({ min: 1 }),
    check('email', '信箱格式錯誤')
        .exists()
        .isEmail()
], controller.memberUpdate);


router.patch('/updatePwd', authUser.userRequired, [//會員資料修改
    check('pwd_old', '原密碼必須輸入正確')
        .isLength({ min: 1 }),
    check('pwd', '密碼必須大於6碼')
        .isLength({ min: 6 })
], controller.memberUpdatePwd);


router.get('/out', async function (req, res, next) {

    req.session.destroy();//清除Session
    return res.json({
        code: 200,
        msg: "登出成功",
        data: ""
    });

});

router.post('/forget', [
    check('account', '帳號必須填寫')
        .exists()
        .isLength({ min: 1 }),
    check('email', '信箱格式錯誤')
        .exists()
        .isEmail()], controller.forgetall);

router.get('/addList', authUser.userRequired, controller.addList);
//router.post('/register2', controller.post2);
//router.get('/login', controller.getlogin);



module.exports = router