
var express = require('express');
var app = express();

var pgp = require("pg-promise")(/*options*/);
var dbUrl = process.env.DATABASE_URL || "postgres://kidweek:123@localhost:5432/kw";
console.log("Using DB URL" + dbUrl);
var db = pgp(dbUrl);

var logger = require("morgan");
var bodyParser = require("body-parser");
var facebook_app_id = "498488837013856";
var apiVersion = "0.2";

var https = require('https');
var request = require('request');

app.use(logger('dev'));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.send("Welcome to Kidweek");
});


app.get('/api/version', function(req, res) { // hae api-versio
    res.status(200).json({version: apiVersion});
})


app.get('/api/test', function(req, res) { // test fb_token validation
    validateUser(req.query.fb_token, function(user) {
        res.status(200).json(user);
    });
})


app.get('/api/test/:friend', function(req, res) { // test if user is in friend list
    isFriend = validateUserFriends(req.query.fb_token, req.params.friend);
    res.status(200).json({isFriend: isFriend});
})


app.get('/api/me/status/:date', function(req, res) { // hae status

    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    fetchStatus(user, new Date(req.params.date))
        .then(function(data) {
            res.status(200).json(data);
        })
        .catch(function(e) {
            if (e.code == 22007) {
                res.status(400).json({status: 'not found', message: 'Invalid date format'});
            }
            else {
                console.log(e); 
                res.status(400).json({status: 'not found', message: 'User was not found'});
            }
        });
})


app.get('/api/me/calendar/:year/:month', function(req, res) { // hae oma status kuukaudelle
    var year = req.params.year;
    var month = req.params.month;
    var user = req.query.fb_token; // todo: käytä oikeaa user id:tä
    
    res.redirect('/api/' + user + '/calendar/' + year + '/' + month + '?fb_token=' + user);
})


app.get('/api/:user/calendar/:year/:month', function(req, res) { // hae kaverin status kuukaudelle

    if ( !(req.params.year >= 2000 && req.params.year <= 3000 &&
        req. params.month >= 1 && req.params.month <= 12)) {
            res.status(404).json({status: 'not found', message: 'Invalid date format'});
    }

    var result = fetchCalendarWithStatuses(req.params.user, req.params.year, req.params.month);
    
    var name = "";
    
    result.then(data =>
        res.status(200).json({name: name, statuses: data})
        )
    .catch(function(e) {
        console.log(e); 
        res.status(400).json({
            status: 'not found',
            message: 'User was not found'
        });
    })
})


app.get('/api/me/friends/:date', function(req, res) { // hae kavereiden statukset annetulle päivälle

    // validoi fb_token ja palauta kaverit
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    var friends = [];
    friends.push ({user_id: "abc123", name: ""});
    friends.push ({user_id: "xyz", name: ""}); // ei kannassa
    friends.push ({user_id: "qwe321", name: ""});

    var date = new Date(req.params.date);
    
    var statusPromises = [];
    friends.forEach(function(friend) {
        statusPromises.push(fetchStatusAndName(friend.user_id, date, friend.name));
    });
                            
    var result = Promise.all(statusPromises);
    result.then(function(data) {
        for(i=0; i<data.length; i++) {
            if (data[i] == undefined) {
                data.splice(i--, 1);
            }
        }
        if(data.length == 0) {
            res.status(404).json({
                status: 'not found',
                message: 'Friends not found'
            })
        }
        else {
            res.status(200).json({date: date.toISOString().substring(0, 10), statuses: data})
        }
    })
    .catch(function(e) {
        if (e.code == 22007) {
            res.status(400).json({status: 'not found', message: 'Invalid date format'});
        }
        else {
            console.log(e); 
            res.status(400).json({status: 'not found', message: 'Friends not found'});
        }
    });
})


app.get('/api/me/exception/:date', function(req, res) { // hae poikkeukset, jotka eivät ole vielä menneet ohi annettuna päivänä

    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    db.any("SELECT exception_start_date, exception_end_date, status, id FROM exceptions WHERE user_id=$1 AND exception_end_date>=$2 ORDER BY exception_start_date", [user, req.params.date])
        .then(function(data) {
            if (data.length > 0) {
                res.status(200).json(data);
            } else {
                res.status(400).json({
                    status: 'not found',
                    message: 'No exceptions found'
                });
            }
        })
        .catch(function(e) {
            if (e.code == 22007) {
                res.status(400).json({status: 'not found', message: 'Invalid date format'});
            }
            else {
                console.log(e); 
                res.status(400).json({status: 'not found', message: 'User not found'});
            }
        });
})


app.delete('/api/me/exception/:id', function(req, res) { // poista poikkeus

    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    db.result("DELETE FROM exceptions WHERE user_id=$1 AND id=$2", [user, req.params.id])
        .then(function(result) {
            console.log(result);
            if (result.rowCount == 1) {
                res.status(200).end();
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


app.post('/api/me/exception', function(req, res) { // luo uusi poikkeus
    
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var status = req.body.status;

    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

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


app.get('/api/me/pattern/:date', function(req, res) { // hae pattern joka on voimassa annettuna päivänä

    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    db.one("SELECT start_at, statuses FROM patterns WHERE user_id=$1 AND start_at<=$2 ORDER BY start_at DESC LIMIT 1", [user, req.params.date])
        .then(function(data) {
            res.status(200).json(data)
        })
        .catch(function(err) {
            res.status(400).json({
                status: 'failed',
                message: 'Pattern not found'
            });
        })
})


app.post('/api/me/pattern', function(req, res) { // luo uusi patterni
    
    var startDate = req.body.startDate;
    var statuses = req.body.statuses;
    var patternLength = statuses.length;
    
    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

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
            if(err.code == '22P02') {
                res.status(400).json({
                    status: 'failed',
                    message: 'Invalid status'
                })
            } else {
                console.log(err);
                res.status(400).json({
                    status: "failed",
                    message: err
                    });
            }
        })    
})


app.post('/api/me', function(req, res) { // luo uusi käyttäjä
    
    // validoi fb_token
    var user = req.query.fb_token; // ja tän tilalle jotain muuta myöhemmin

    db.none("INSERT INTO users (id) VALUES ($1)", user)
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


var fetchStatusAndName = function(userId, date, name) {
    return db.one("SELECT status($1, $2)", [userId, date])
        .then(function(data) {
            if (data.status != null) {
                return {
                    user_id: userId,
                    name: name,
                    status: data.status,
                };
             } 
        })
}

var fetchStatus = function(userId, date) {
    return db.one("SELECT status($1, $2)", [userId, date])
        .then(function(data) {
            if (data.status != null) {
                var result = {
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

var fetchCalendarWithStatuses = function(user, year, month) {
    var daysInMonth = new Date(year, month, 0).getDate();
    var statusPromises = [];

    for (i = 1; i <= daysInMonth; i++) {
        var date = new Date(Date.UTC(year, month - 1, i));
        statusPromises.push(fetchStatus(user, date));
    }
    
    return Promise.all(statusPromises);
}


var validateUser = function(fb_token, callback) {
    var user = {name: "", id: ""};
    request('https://graph.facebook.com/v2.7/me?access_token='+fb_token, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(JSON.parse(body));
        }
    });
}


var validateUserFriends = function(fb_token, friend) {
    var isFriend = false;
    request('https://graph.facebook.com/v2.7/me/friends/'+friend+'?access_token='+fb_token, function (error, response, body) {
        if (!error && response.statusCode == 200 && JSON.parse(body).data.length == 1) {
            isFriend = true;
        }
        console.log(isFriend);
        return friend
    });
}


app.listen(app.get('port'), function () {
  console.log('Kidweek listening on port ' + app.get('port') + '!');
});