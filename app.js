
var express = require('express');
var app = express();

var logger = require("morgan");
var bodyParser = require("body-parser");
var facebook_app_id = "498488837013856";
var apiVersion = "0.3";

var https = require('https');
var request = require('request');

var me = require('./routes/me');
var friend = require('./routes/friend');

app.use(logger('dev'));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.send("Welcome to Kidweek");
});

app.get('/api/version', function(req, res) { // hae api-versio
    res.status(200).json({version: apiVersion});
})

app.get('/api/test/me/status/:date', me.statusForDate);

app.post('/api/me', me.createUser);
app.get('/api/me/status/:date', me.statusForDate);
app.get('/api/me/calendar/:year/:month', me.calendar)

app.get('/api/me/friends/:date', friend.friendsStatusesForDate); // hae kavereiden statukset annetulle päivälle
app.get('/api/:friend/calendar/:year/:month', friend.calendar); // hae kaverin status kuukaudelle

app.get('/api/me/exception/:date', me.exception);
app.delete('/api/me/exception/:id', me.deleteException); // poista poikkeus
app.post('/api/me/exception', me.createException); // luo uusi poikkeus

app.get('/api/me/pattern/:date', me.pattern);// hae pattern joka on voimassa annettuna päivänä
app.post('/api/me/pattern', me.createPattern); // luo uusi patterni

app.listen(app.get('port'), function () {
  console.log('Kidweek listening on port ' + app.get('port') + '!');
});