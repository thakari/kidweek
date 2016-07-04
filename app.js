var express = require('express');
var app = express();

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://kidweek:123@localhost:5432/kw");

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    
    res.send("Tervetuloa");
});

app.get('/api/statuses/:fb_token/:date', function(req, res) { // hae status

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin
    var firstName = "";
    var lastName = "";

    console.log("statuses: user: " + user + ", date: " + req.params.date);
    db.one("SELECT status($1, $2)", [user, req.params.date])
        .then(function(data) {
            if (data.status != null) {
                var result = {
                    user_id: user,
                    first_name: firstName,
                    last_name: lastName,
                    status: data.status
                }
                res.send(result);
                res.status(200)
                    .json({
                        status: 'success',
                        data: result,
                        message: 'Retrieved user status'
                    });
             } else {
                res.status(404)
                    .json({
                        status: 'not found',
                        message: 'User was not found'
                    });
            }
        })
});

/*
app.get('/api/friends_statuses/:fb_token/:date', function(req, res) { // hae kavereiden statukset
    var friends = [];
    var i;
    var len;
    
    // validoi fb_token ja palauta kaverit
    friends.push ({user_id: "abc123", first_name: "", last_name: ""};
    friends.push ({user_id: "qwe321", first_name: "", last_name: ""};
    
    console.log("friends_status: user: " + user + ", date: " + req.params.date);
    
    len = friends.length;
    for (i=0; i<len; i++) { // tätä pitää muuttaa käymään koko taulukko läpi
        db.one("SELECT status($1, $2)", [friends[i].user_id, req.params.date])
            .then(function(data) {
                friends[i].status = data.status;
            })
    })
    res.send(friends);    
})
*/

/* 
app.get('/api/month_statuses/:fb_token/:date, function(req, res) { // hae kuukauden statukset
        
}')
*/

/*
app.post('/api/statuses/:fb_token/...', function(req, res) { // luo uusi patterni
    
})
*/

app.get('/api/exceptions/:fb_token/:date', function(req, res) { // hae poikkeukset

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    console.log("exceptions: user: " + user + ", date: " + req.params.date);
    db.any("SELECT exception_start_date, exception_end_date, status FROM exceptions WHERE user_id=$1 AND exception_end_date>=$2 ORDER BY exception_start_date", [user, req.params.date])
        .then(function(data) {
            if (data.length > 0) {
                res.status(200)
                    .json({
                        status: 'success',
                        data: data,
                        message: 'Retrieved ' + data.length + ' exceptions'
                    });
            } else {
                res.status(404)
                    .json({
                        status: 'not found',
                        message: 'No exceptions found'
                    });
            }
        })
        .catch(function(err) {
            res.send("Not found... " + err);
        })
})

/*
app.post('/api/exceptions/:fb_token/...', function(req, res) { // luo uusi poikkeus

})
*/

/*
app.delete('/api/exceptions/:fb_token/:id', function(req, res) { // poista poikkeus
    
})
*/

/*
app.get('/api/status/:date', function (req, res) {
    console.log("Date in req is" + req.params.date);
    var queryDate = new Date(req.params.date);
    db.one("select start_at, array_to_json(statuses) as stats from patterns where user_id=$1", 'qwe321')
        .then(function(data) {
            console.log("Got here " + data.start_at);
            var length = data.stats.length;
            var d = data.start_at;
            var today = new Date();
            var currentDate = data.start_at;
            var finalStatus = 'none';
            while (currentDate <= queryDate) {
                var a = data.stats.some(function(entry) {
                    finalStatus = entry;
                    console.log('prosessing' + currentDate.getDate() + ', status is ' + entry);
                    if (currentDate >= today) {
                        console.log("Status is " + finalStatus);
                        return true;
                    } else {
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                })  
            }
            console.log("Status " + finalStatus);
            var result = {
                status: finalStatus,
                name: "John Doe"
            }
            res.send(result);
    })
});
*/

app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!');
});