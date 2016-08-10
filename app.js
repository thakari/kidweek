var express = require('express');
var app = express();
var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://kidweek:123@localhost:5432/kw");
var logger = require("morgan");
var bodyParser = require("body-parser");

app.use(logger('dev'));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.send("Tervetuloa");
});

app.get('/api/status/:date/:fb_token', function(req, res) { // hae status

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    fetchStatus(user, new Date(req.params.date))
        .then(function(data) {
            res.status(200).json({
                status: 'success',
                data: data,
                message: 'Retrieved user status'
            });
        })
        .catch(function(e) {
            console.log(e);
            res.status(404).json({
                status: 'not found',
                message: 'User was not found'
            });
    
        });
})


app.get('/api/status/calendar/:year/:month/:fb_token', function(req, res) { // hae oma status kuukaudelle
    var month = req.params.month;
    var daysInMonth = new Date(req.params.year, month, 0).getDate();
    var statusPromises = [];
    var day;

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin
    
    for (i = 1; i <= daysInMonth; i++) {
        day = new Date(req.params.year, month-1, i);
        console.log("month: " + month + ", day: " + i + ", " + day);
        statusPromises.push(fetchStatus(user, day));
    }
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200).json({
            status: 'success',
            data: data,
            message: 'Retrieved user status'
        })
    )
    .catch(function(e) {
        console.log(e);
        res.status(404).json({
            status: 'not found',
            message: 'User was not found'
        });
    })
})


app.get('/api/status/calendar/:year/:month/:user/:fb_token', function(req, res) { // hae kaverin status kuukaudelle
    var month = req.params.month;
    var daysInMonth = new Date(req.params.year, month, 0).getDate();
    var statusPromises = [];

    // validoi fb_token ja kaveri
    var firstName = "";
    var lastName = "";
    
    for (i = 1; i <= daysInMonth; i++) {
        console.log("month: "+month+", day: "+i+", "+new Date(req.params.year, month-1, i));
        statusPromises.push(fetchStatus(req.params.user, new Date(req.params.year, month-1, i)));
    }
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200)
            .json({
                status: 'success',
                data: {first_name: firstName, last_name: lastName, statuses: data},
                message: 'Retrieved user status'
            })
        )
    .catch(function(e) {
        console.log(e); 
        res.status(404).json({
            status: 'not found',
            message: 'User was not found'
        });
    })
})


app.get('/api/friends_status/:date/:fb_token', function(req, res) { // hae kavereiden statukset annetulle päivälle

    // validoi fb_token ja palauta kaverit
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    var friends = [];
    friends.push ({user_id: "abc123", first_name: "", last_name: ""});
    friends.push ({user_id: "qwe321", first_name: "", last_name: ""});
    friends.push ({user_id: "xyz", first_name: "", last_name: ""});

    var date = new Date(req.params.date);
    
    var statusPromises = [];
    friends.forEach(function(friend) {
        statusPromises.push(fetchStatusAndName(friend.user_id, date, friend.first_name, friend.last_name));
    });
                            
    var result = Promise.all(statusPromises);
    result.then(data =>
        res.status(200)
            .json({
                status: 'success',
                data: {date: date, statuses: data},
                message: 'Retrieved friends\' statuses'
            })
        )
    .catch(function(e) {
        console.log(e);
        res.status(404).json({
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
                res.status(400).json({
                    status: 'not found',
                    message: 'No exceptions found'
                });
            }
        })
        .catch(function(err) {
            res.status(400).json({
                status: 'failed',
                message: err
            });
        })
})


app.delete('/api/exceptions/:id/:fb_token', function(req, res) { // poista poikkeus

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    db.result("DELETE FROM exceptions WHERE user_id=$1 AND id=$2", [user, req.params.id])
        .then(function(result) {
            console.log(result);
            if (result.rowCount == 1) {
                res.status(204).end();
            }
            else {
                res.status(400).json({
                    status: 'failed',
                    message: 'not found'
                });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(400).json({
                status: 'failed',
                message: err
            });
        })    
})


app.post('/api/exceptions/:fb_token', function(req, res) { // luo uusi poikkeus
    
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var status = req.body.status;

    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    if (startDate >= endDate) {
        res.status(400).json({
            status: 'failed',
            message: 'startDate not before endDate'
        });
    }
    
    db.none("INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ($1, $2, $3, $4)", [user, startDate, endDate, status])
        .then(function() {
            res.status(201).end();
        })
        .catch(function(err) {
                res.status(400).json({
                status: "failed",
                message: err
            })
        })
})


app.post('/api/pattern/:fb_token', function(req, res) { // luo uusi patterni
    
    var startDate = req.body.startDate;
    var statuses = req.body.statuses;
    var patternLength = statuses.length;
    
    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin

    if ((patternLength % 7) != 0 && patternLength != 1) {
        res.status(400).json({
            status: 'failed',
            message: 'Invalid array length'
        });
    }

    var patternString = '{"' + statuses[0] + '"';
    for (i = 1; i < patternLength; i++) {
        patternString = patternString + ', "' + statuses[i] + '"';
    }
    patternString = patternString + '}';
  
    db.none("INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ($1, $2, $3, NOW())", [user, startDate, patternString])
        .then(function() {
            res.status(201).end();
        })
        .catch(function(err) {
            console.log(err);
                res.status(400).json({
                status: "failed",
                message: err
            });
        })    
})

var fetchStatusAndName = function(userId, date, firstName, lastName) {
    return db.one("SELECT status($1, $2)", [userId, date])
        .then(function(data) {
            if (data.status != null) {
                return {
                    user_id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    status: data.status,
                };
             } 
        })
}

var fetchStatus = function(userId, date) {
    console.log("fetchStatus: date: "+date);
    return db.one("SELECT status($1, $2)", [userId, date])
        .then(function(data) {
            if (data.status != null) {
                var result = {
//                  user_id: userId,
//                  first_name: "firstName",
//                  last_name: "lastName",
                    status: data.status,
                    date: date.toISOString().substring(0, 10)
                };
                console.log(result);
                return result;
             } else {
                 throw "User " + userId + " status not found for " + date;
             } 
        })
}

app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!');
});