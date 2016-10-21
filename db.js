var pgp = require("pg-promise")(/*options*/);

var dbUrl = process.env.DATABASE_URL || "postgres://kidweek:123@localhost:5432/kw";

var loadDb = function() {
    if (db) {
        return db;
    }
    db = pgp(dbUrl);
    console.log("Using DB " + dbUrl);
    return db;
}

var db = loadDb();

exports.client = db;

exports.fetchStatusAndName = function(userId, date, name) {
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

exports.fetchStatus = function(userId, date) {
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

exports.fetchCalendarWithStatuses = function(user, year, month) {
    var daysInMonth = new Date(year, month, 0).getDate();
    var statusPromises = [];

    for (i = 1; i <= daysInMonth; i++) {
        var date = new Date(Date.UTC(year, month - 1, i));
        statusPromises.push(exports.fetchStatus(user, date));
    }

    return Promise.all(statusPromises);
}
