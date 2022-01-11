
const authAdmin = {
    //判斷使用者登入
    adminRequired: (req, res, next) => {
        if (req.session.adminInfo == undefined) {
            console.log(req.session.adminInfo);
            return res.json({
                code: 401,
                msg: "尚未登入",
                data: ""
        
              });
           // return res.redirect('/login'); //跳轉至登入頁面
        }
        next();
    }
}
module.exports = authAdmin