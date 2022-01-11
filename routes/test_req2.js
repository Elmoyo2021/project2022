
const express = require("express")
const router = express.Router()
const rp = require('request-promise');

async function main() {

    var options = {
        method: 'POST',
        uri: 'http://192.168.1.11:3000/shoot-door/bet',
        form: {
            // Like <input type="text" name="name">
            bet_type: 'bowz2A',
            bet_amount: '20000'
        }
    };
    
    /*
    const res = await rp(options)
    console.log(res);*/

    await rp(options)
        .then(function (body) {
            // POST succeeded...
            //console.log("OK");
        })
        .catch(function (err) {
            // POST failed...
            console.log("failed" + err);
        });
}

//console.log("Running")
const times = 20
for (let i = 0; i < times; i++) {
    //main()
}


module.exports = router
