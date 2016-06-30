var express = require('express');
var app = express();

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://emononen:kanta321@localhost:5432/kw");
var user = {};
db.one("SELECT * from patterns limit 1")
    .then(function (data) {
        console.log("DATA:", data.id);
        user = data;
    })
    .catch(function (error) {
        console.log("ERROR:", error);
    });



app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    
    res.send(user);
});

app.get('/api/status/', function (req, res) {
    db.one("select start_at, array_to_json(statuses) as stats from patterns where user_id=$1", 'qwe321')
        .then(function(data) {
            console.log("Got here " + data.start_at);
            var length = data.stats.length;
            var d = data.start_at;
            var today = new Date();
            var currentDate = data.start_at;
            var finalStatus = 'none';
            while (currentDate <= today) {
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
    })
    res.send(user);
});


app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!');
});