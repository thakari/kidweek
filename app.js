var express = require('express');
var app = express();

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://kidweek:123@localhost:5432/kw");

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    
    res.send("Tervetuloa");
});

app.get('/api/test/:user/:date', function (req, res) {
    var queryDate = new Date(req.params.date);
    db.one("select start_at, array_to_json(statuses) as stats from patterns where user_id=$1 order by start_at desc", req.params.user)
        .then(function(data) {
            var patternStartDate = new Date(data.start_at);
            var position = (queryDate-patternStartDate) % data.stats.length;
            var queryStatus = data.stats[position];
            var result = {
                user_id: req.params.user,
                first_name: "",
                last_name: "",
                status: queryStatus
            }
            res.send(result);
        })
        .catch(function(error) {
            res.send("pattern not found");
        })
});

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


app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!');
});