var express = require('express');
var app = express();
var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://kidweek:123@localhost:5432/kw");
var logger = require("morgan");

app.use(logger('dev'));
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.send("Tervetuloa");
});

app.get('/api/status/:date/:fb_token', function(req, res) { // hae status

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    fetchStatus(user, new Date(req.params.date))
        .then(function(data) {
            res.status(200)
                .json({
                    status: 'success',
                    data: data,
                    message: 'Retrieved user status'
                });
        })
        .catch(function(e) {
            console.log(e);        
            res.status(404)
                .json({
                    status: 'not found',
                    message: 'User was not found'
                });
    
    });
});

app.get('/api/status/calendar/:year/:month/:fb_token', function(req, res) { // hae oma status kuukaudelle
    var month = req.params.month;
    var daysInMonth = new Date(req.params.year, month, 0).getDate();
    var statusPromises = [];

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin
    
    for (i = 1; i <= daysInMonth; i++) {
        console.log("month: "+month+", day: "+i+", "+new Date(req.params.year, month-1, i));
        statusPromises.push(fetchStatus(user, new Date(req.params.year, month-1, i)));
    }
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200)
            .json({
                status: 'success',
                data: data,
                message: 'Retrieved user status'
            })
        )
    .catch(function(e) {
        console.log(e);        
        res.status(404)
            .json({
                status: 'not found',
                message: 'User was not found'
            });
    })
});

app.get('/api/status/calendar/:year/:month/:user/:fb_token', function(req, res) { // hae kaverin status kuukaudelle
    var month = req.params.month;
    var daysInMonth = new Date(req.params.year, month, 0).getDate();
    var statusPromises = [];

    // validoi fb_token ja kaveri
    
    for (i = 1; i <= daysInMonth; i++) {
        console.log("month: "+month+", day: "+i+", "+new Date(req.params.year, month-1, i));
        statusPromises.push(fetchStatus(req.params.user, new Date(req.params.year, month-1, i)));
    }
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200)
            .json({
                status: 'success',
                data: data,
                message: 'Retrieved user status'
            })
        )
    .catch(function(e) {
        console.log(e);        
        res.status(404)
            .json({
                status: 'not found',
                message: 'User was not found'
            });
    })
});

app.get('/api/friends_status/:date/:fb_token', function(req, res) { // hae kavereiden statukset annetulle päivälle
    // validoi fb_token ja palauta kaverit
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    var friends = [];
    friends.push ({user_id: "abc123", first_name: "", last_name: ""});
    friends.push ({user_id: "qwe321", first_name: "", last_name: ""});

    var date = new Date(req.params.date);
    console.log("GET friends_status: user: " + user + ", date: " + date);
    
    var statusPromises = [];
    friends.forEach(function(friend) {
        statusPromises.push(fetchStatus(friend.user_id, date));
    });
                            
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200)
            .json({
                status: 'success',
                data: data,
                message: 'Retrieved friends\' statuses'
            })
        )
    .catch(function(e) {
        console.log(e);        
        res.status(404)
            .json({
                status: 'not found',
                message: 'Friend not found'
            });
    })

})

app.get('/api/exceptions/:date/:fb_token', function(req, res) { // hae poikkeukset, jotka eivät ole vielä menneet ohi annettuna päivänä

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    console.log("GET exceptions: user: " + user + ", date: " + req.params.date);
    db.any("SELECT exception_start_date, exception_end_date, status, id FROM exceptions WHERE user_id=$1 AND exception_end_date>=$2 ORDER BY exception_start_date", [user, req.params.date])
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

app.delete('/api/exceptions/:id/:fb_token', function(req, res) { // poista poikkeus

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    console.log("DELETE exceptions: user: " + user + ", date: " + req.params.date);
    db.one("DELETE FROM exceptions WHERE user_id=$1 AND id=$2", [user, req.params.id])
        .then(function(data) {
            res.status(200)
                .json({
                    status: 'success',
                    data: data,
                    message: 'Deleted'
                });
        })
        .catch(function(err) {
            res.send("Not found... " + err);
        })
    
})

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

var fetchStatus = function(userId, date) {
    return db.one("SELECT status($1, $2)", [userId, date])
        .then(function(data) {
            if (data.status != null) {
                return {
                    user_id: userId,
                    first_name: "firstName",
                    last_name: "lastName",
                    status: data.status,
                    date: date.toISOString().substring(0, 10)
                    
                };
             } else {
                 throw "User " + userId + " status not found for " + date;
             } 
        })
}

app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!');
});