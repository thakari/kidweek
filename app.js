var express = require('express');
var app = express();

var pgp = require("pg-promise")(/*options*/);
var db = pgp("postgres://kidweek:123@localhost:5432/kw");

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    
    res.send("Tervetuloa");
});

app.get('/api/status1/:fb_token/:date', function (req, res) {
    var queryDate = new Date(req.params.date);
    var queryStatus = "";
    
    // validoi fb_token
    var user = req.params.fb_token; // ja tän tilalle jotain muuta myöhemmin
    var firstName = "";
    var lastName = "";

    console.log("status1: user: " + user + ", date: " + req.params.date);

    // hae patterni kannasta
    console.log("Haetaan patternia");
    db.one("select start_at, array_to_json(statuses) as stats from patterns where user_id=$1 and start_at<=$2 order by start_at desc", [user, req.params.date])
        .then(function(data) {
            // lasketaan status
            var patternStartDate = new Date(data.start_at);
            var position = (queryDate-patternStartDate) % data.stats.length;
            queryStatus = data.stats[position];
            console.log("Patterni löydetty, status: " + queryStatus);
        })
        .catch(function(error) {
            res.send("pattern not found");
        })
/*
    // hae mahdolliset poikkeukset kannasta
    db.one("select exception_start_date, exception_end_date, status from exceptions where user_id=$1 and exception_start_date<=$2 and exception_end_date>=$2 order by created_on desc", [user, req.params.date])
        .then(function(data) { // poikkeuksia ko. päivällä
            console.log("Poikkeus löydetty");
            var exceptionStartDate = new Date(data.exception_start_date);
            var exceptionEndDate = new Date(data.exception_end_date);

            if (data.status = "present") { // poikkeuksellisesti paikalla
                console.log("Poikkeuksellisesti paikalla");
                if (exceptionStartDate == queryDate && queryStatus == "away") {
                    queryStatus = "arrives";
                } else if (exceptionStartDate == queryDate && queryStatus == "leaves") {
                    queryStatus = "present";
                } else if (exceptionEndDate == queryDate && queryStatus == "away") {
                    queryStatus = "leaves";
                } else if (exceptionEndDate == queryDate && queryStatus == "arrives") {
                    queryStatus = "present";
                } else {
                    queryStatus = "present";
                    console.log("Paikalla ollaan " + queryStatus);
                }
            } else { // poikkeuksellisesti poissa
                if (exceptionStartDate == queryDate && queryStatus == "present") {
                    queryStatus = "leaves";
                } else if (exceptionStartDate == queryDate && queryStatus == "arrives") {
                    queryStatus = "away";
                } else if (exceptionEndDate == queryDate && queryStatus == "present") {
                    queryStatus = "arrives";
                } else if (exceptionEndDate == queryDate && queryStatus == "leaves") {
                    queryStatus = "away";
                } else {
                    queryStatus = "away";
                }
            }
        })
*/
        console.log("Palautetaan vastaus (status: " + queryStatus + ")");
        var result = {
            user_id: user,
            first_name: firstName,
            last_name: lastName,
            status: queryStatus
        }
        res.send(result);
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