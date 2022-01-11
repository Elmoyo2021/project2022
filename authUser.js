
const authUser = {
    //判斷使用者登入
    userRequired: (req, res, next) => {
        if (req.session.userinfo == undefined) {
            console.log(req.session.userinfo);
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
module.exports = authUser