var request = require('request');
var db = require('./../db');

exports.statusForDate = function(req, res) { // hae status
    getCurrentUser(req.query.fb_token)
        .then(function(user) {
            return db.fetchStatus(user.id, new Date(req.params.date));
        })
        .then(function(status) {
            res.status(200).json(status);
        })
        .catch(function(errorStatusCode) {
            res.status(errorStatusCode).json({status: 'error', message: 'Authentication failed'});
        });

}

exports.createUser = function(req, res) { // luo uusi käyttäjä

    getCurrentUser(req.query.fb_token)
        .then(function(user) {
            return db.client.none("INSERT INTO users (id) VALUES ($1)", user.id)
        }).then(function() {
            res.status(201).end();
        }).catch(function(error) {
            console.log(error);
            res.status(400).json({
                message: error
            })
        })
}

exports.calendar = function(req, res) { // hae oma status kuukaudelle
    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.fetchCalendarWithStatuses(me.id, req.params.year, req.params.month)
        })
        .then(
            data => res.status(200).json({statuses: data}))
        .catch(function(e) {
                console.log(e);
                res.status(404).end();
        })
}


exports.exception = function(req, res) { // hae poikkeukset, jotka eivät ole vielä menneet ohi annettuna päivänä

    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.client.many("SELECT exception_start_date, exception_end_date, status, id FROM exceptions WHERE user_id=$1 AND exception_end_date>=$2 ORDER BY exception_start_date", [me.id, req.params.date])
        })
        .then(function(data) {
            res.status(200).json({date: req.params.date.toISOString().substring(0, 10), exceptions: data});
        })
        .catch(function(err) {
            console.log(err);
            res.status(404).end();
        })
}


exports.deleteException = function(req, res) { // poista poikkeus
    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.client.any("DELETE FROM exceptions WHERE user_id=$1 AND id=$2", [me.id, req.params.id]);
        })
        .then(function(result) {
            res.status(200).end();
        })
        .catch(function(err) {
            console.log(err);
            res.status(404).end();
        })
}

exports.createException = function(req, res) { // luo uusi poikkeus

    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var status = req.body.status;
    console.log(startDate + " e " + endDate);

    if (startDate >= endDate) {
        res.status(400).json({
            status: 'failed',
            message: 'startDate not before endDate'
        });
        return;
    }

    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.client.none("INSERT INTO exceptions (user_id, exception_start_date, exception_end_date, status) VALUES ($1, $2, $3, $4)", [me.id, startDate, endDate, status])
        })
        .then(function() {
            res.status(201).end();
        })
        .catch(function(err) {
            console.log(err);
            res.status(404).end();
        })
}


exports.pattern = function(req, res) { // hae pattern joka on voimassa annettuna päivänä

    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.client.one("SELECT start_at, statuses FROM patterns WHERE user_id=$1 AND start_at<=$2 ORDER BY start_at DESC LIMIT 1", [me.id, req.params.date])
        })
        .then(function(data) {
            res.status(200).json(data)
        })
        .catch(function(err) {
            console.log(err);
            res.status(404).end();
        })
}



exports.createPattern = function(req, res) { // luo uusi patterni

    var startDate = req.body.startDate;
    var statuses = req.body.statuses;
    var patternLength = statuses.length;

    if ((patternLength % 7) != 0 && patternLength != 1) {
        res.status(400).json({status: 'failed', message: 'Invalid array length'});
    }

    if (patternLength == 1 && statuses[0] != 'away' && statuses[0] != 'present') {
        res.status(400).json({status: 'failed', message: 'Invalid single status'});
    }

    for (i=1; i<patternLength; i++) {
        if((statuses[i] == 'away' && statuses[i-1] != 'leaves' && statuses[i-1] != 'away') ||
           (statuses[i] == 'present' && statuses[i-1] != 'arrives' && statuses[i-1] != 'present') ||
           (statuses[i] == 'leaves' && statuses[i-1] != 'present') ||
           (statuses[i] == 'arrives' && statuses[i-1] != 'away')) {
            res.status(400).json({status: 'failed', message: 'Invalid transition in array'});
            return;
        }
    }

    var patternString = '{"' + statuses[0] + '"';
    for (i = 1; i < patternLength; i++) {
        patternString = patternString + ', "' + statuses[i] + '"';
    }
    patternString = patternString + '}';

    getCurrentUser(req.query.fb_token)
        .then(function(me) {
            return db.client.none(
              "INSERT INTO patterns (user_id, start_at, statuses, created_on) VALUES ($1, $2, $3, NOW())",
              [me.id, startDate, patternString])
        })
        .then(function() {
            res.status(201).end();
        })
        .catch(function(err) {
            console.log(err);
            if(err.code == '22P02') {
                res.status(400).json({
                    status: 'failed',
                    message: 'Invalid status'
                })
            } else {
                res.status(404).end();
            }
        })
}

var getCurrentUser = function(fb_token) {
    return new Promise(function(resolve, reject) {
        var url = 'https://graph.facebook.com/v2.8/me?access_token=' + fb_token;
        console.log("GET... " + url);
        request(url, function (error, response, body) {
            console.log("graph api response " + response + ", body " + body + ", error " + error);
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body));
            } else {
                console.log("Rejecting " + error);
                reject(response.statusCode);
            }
        });
    });
}
