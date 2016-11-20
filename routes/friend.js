var request = require('request');
var db = require('./../db');
var me = require('./me')

exports.calendar = function(req, res) { // hae kaverin status kuukaudelle

    if ( !(req.params.year >= 2000 && req.params.year <= 3000 &&
        req.params.month >= 1 && req.params.month <= 12)) {
            res.status(404).json({status: 'error', message: 'Invalid date format'});
            return;
    }

    me.getCurrentUser(req.query.fb_token)
      .then(function(user) {
          if (user.id == req.params.friend) { // oman kalenterin haku
            return db.fetchCalendarWithStatuses(req.params.friend, req.params.year, req.params.month);
          } else { // kaverin kalenteri
            return validateUserFriend(req.query.fb_token, req.params.friend)
                .then(function(friends) {
                    return db.fetchCalendarWithStatuses(req.params.friend, req.params.year, req.params.month);
                })
          }
      })
      .then(function(data) {
          res.status(200).json({user: req.params.friend, statuses: data})
      })
      .catch(function(e) {
          console.log(e);
          res.status(401).end();
      });
}

exports.friendsStatusesForDate = function(req, res) { // hae kavereiden statukset annetulle päivälle

    fetchUserFriends(req.query.fb_token)
        .then(function(friends) {
            var date = new Date(req.params.date);
            var statusPromises = [];
            friends.forEach(function(friend) {
                console.log("data for friend... " + friend.id);
                statusPromises.push(db.fetchStatusAndName(friend.id, date, friend.name));
            });

            var result = Promise.all(statusPromises);
            result.then(function(data) {
                console.log("data for all " + data);
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
                    res.status(200).json({date: date.toISOString().substring(0, 10), friends: data})
                }
            })
            .catch(function(e) {
                if (e.code == 22007) {
                    res.status(400).json({status: 'not found', message: 'Invalid date format'});
                }
                else {
                    console.log(e);
                    res.status(404).json({status: 'not found', message: 'Friends not found'});
                }
            });
        })
        .catch(function(errorStatusCode) {
            res.status(errorStatusCode).json({status: 'error', message: 'Authentication failed'});
        });
}


var validateUserFriend = function(fb_token, friend) {
    return new Promise(function(resolve, reject) {
        request('https://graph.facebook.com/v2.7/me/friends/'+friend+'?access_token='+fb_token, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var friends = JSON.parse(body).data;
                if (friends.length == 1) { // requested user is a friend
                    resolve(friends);
                } else {
                    console.log("Not a valid friend " + friend)
                    reject(401);
                }
            } else {
                console.log("Validating friend failed " + response.statusCode)
                reject(response.statusCode);
            }
        });
    });
}

var fetchUserFriends = function(fb_token) {
    return new Promise(function(resolve, reject) {
        request('https://graph.facebook.com/v2.7/me/friends?access_token='+fb_token, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body).data);
            } else {
                reject(response.statusCode);
            }
        });
    });
}
