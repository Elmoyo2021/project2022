

const { check, validationResult } = require('express-validator')
const authAdminRecord = {
    //判斷使用者登入
    adminRecordRequired: (req, res, next) => {
        const errors = validationResult(req)
        console.log(errors)
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
        }else{
            next();
        }
    }
}
module.exports = authAdminRecord