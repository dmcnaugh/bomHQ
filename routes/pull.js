/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 9/07/13
 * Time: 4:50 PM
 * TODO: needs some well planned separation of the services i.e. fetch data from BOM and store in mongodb, the mongodb connection awy from the routes.
 */
var request = require('request');
var mongo = require('mongodb');
var cron = require('cron');

var BSON = mongo.BSONPure;

var MongoClient = mongo.MongoClient;
var db;

var mongoConn = [
    'mongodb://localhost/weather',
    'mongodb://debian-box.local/weather',
    'mongodb://app:app@wp.mackeneight.net:27017/weather',
    'mongodb://app:app@ds031978.mongolab.com:31978/weather'
];

if ('development' == app.get('env')) {
    var conn = mongoConn[1];
} else {
    var conn = process.env.MONGODB || mongoConn[0];
}

MongoClient.connect(conn, { server: { auto_reconnect: true, socketOptions: { keepAlive: 1}}}, function(err, dbc) {
    if (err) throw 'MongoDB Error: Failed to connect to: ' + conn;
    db = dbc;
    debug("Connected to " + db.options.url + " : " + db.databaseName + " database");
});

function pad2(number) {
    return (number < 10 ? '0' : '') + number
}

var REQ = function(BOM_ID) {

    BOM_ID = BOM_ID || 'IDR712';

    var imgFile= "http://www.bom.gov.au/radar/" + BOM_ID + ".T.";

    var doc = {};

    doc.reqDate = new Date();
    debug('REQ:'+doc.reqDate.toUTCString());

    doc.stamp = doc.reqDate.getUTCFullYear().toString();
    doc.stamp += pad2(doc.reqDate.getUTCMonth()+1);
    doc.stamp += pad2(doc.reqDate.getUTCDate());
    doc.stamp += pad2(doc.reqDate.getUTCHours());
    doc.stamp += pad2(Math.floor(doc.reqDate.getUTCMinutes()/6)*6);
    debug('REQ:'+doc.stamp);

    doc.imgFile = imgFile + doc.stamp + '.png';
    debug('REQ:'+doc.imgFile);

    request({url: doc.imgFile, method: 'HEAD'}, function (error, response, body) {
        /*
         *TODO: need to cope with error conditions here
         */
//        console.log(error);
        debug('BOM:'+response.statusCode);
        debug('BOM:'+response.headers.date);

        if (!error && response.statusCode == 200) {
            /*
             * encoding: null - forces the request() to return body as a buffer (not string)
             */
            request({url: doc.imgFile, method: 'GET', encoding: null}, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    doc.header = response.headers;
                    doc.image = body;

                    db.collection(BOM_ID, function(err, collection) {
                        if (err) throw err;
                        collection.insert( doc , function(err, result) {
                            if (err) throw err;
                        });
                    });


                }
            });
        }
    });
};

var stations = [ 'canterbury' , 'sydney-observatory-hill', 'sydney-olympic-park'];

var STATS = function() {

    var source = "http://www.bom.gov.au/nsw/observations/sydney.shtml";
    var doc = {};

    doc.reqDate = new Date();

    var temp = "<td headers=\"obs-temp obs-station-%STN%\"> *([0-9]*\\.[0-9]+) *</td>";
    var rain = "<td headers=\"obs-rainsince9am obs-station-%STN%\"> *([0-9]*\\.[0-9]+) *</td>";
    var hum = "<td headers=\"obs-relhum obs-station-%STN%\"> *([0-9]+) *</td>";
    var press = "<td headers=\"obs-press obs-station-sydney-observatory-hill\"> *([0-9]*\\.[0-9]+) *</td>"

    request({url: source, method: 'HEAD'}, function (error, response, body) {
        /*
         *TODO: need to cope with error conditions here
         */
//        console.log(error);
        debug('STATS:'+response.statusCode);
        debug('STATS:'+response.headers.date);

        if (!error && response.statusCode == 200) {

            request({url: source, method: 'GET'}, function (error, response, body) {

                doc.content = body;

                for(i=0; i < stations.length; i++) {

                    doc[stations[i]] = {};

                    doc[stations[i]].temp = parseFloat(RegExp(temp.replace('%STN%', stations[i])).exec(body)[1]);
                    doc[stations[i]].rain = parseFloat(RegExp(rain.replace('%STN%', stations[i])).exec(body)[1]);
                    doc[stations[i]].hum = parseFloat(RegExp(hum.replace('%STN%', stations[i])).exec(body)[1]);

                }

                doc['sydney-observatory-hill'].press = parseFloat(RegExp(press).exec(body)[1]);

                db.collection('OBS_SYD', function(err, collection) {
                    if (err) throw err;
                    collection.insert( doc , function(err, result) {
                        if (err) throw err;
                    });
                });

            });

        }

    });

};

var bomTargets = [ 'IDR712', 'IDR713', 'IDR714' ];
var job = [];


if ('production' != app.get('env')) {
    REQ = function() {} ;
    STATS = function() {};
}

job[0] = new cron.CronJob('0 5-59/6 * * * *', function() { REQ(bomTargets[0]); }); job[0].start();
job[0].name = bomTargets[0];
job[1] = new cron.CronJob('15 5-59/6 * * * *', function() { REQ(bomTargets[1]); }); job[1].start();
job[1].name = bomTargets[1];
job[2] = new cron.CronJob('30 5-59/6 * * * *', function() { REQ(bomTargets[2]); }); job[2].start();
job[2].name = bomTargets[2];
job[3] = new cron.CronJob('45 5-59/6 * * * *', function() { STATS(); }); job[3].start();
job[3].name = 'STATS';

/**
 * The services end here ^^^
 *
 * There are plenty of dependencies between the two including
 *      job[]
 *      stations[]
 *      db  - the mongodb database connection
 *
 * And the routes start here vvv
 */


exports.imgList = function(req, res) {

    var range = req.params.range || 'IDR713';
    var span = parseInt(req.params.span) || 10;

    var proj = { stamp: 1, _id: 0 };

    db.collection(range, function(err, collection) {
        if (err) throw err;
        collection.find({}, proj).sort({stamp: -1}).limit(span).toArray(function(err, result) {
            if (err) throw err;
            var table = result.map(function(e) { return parseInt(e.stamp); });
            table.sort(function (a,b) {return a - b;}); //(re)sort by reqDate (ascending)
            res.send(table);

        });
    });
}

exports.show = function(req, res) {
    var range = req.params.range || 'IDR713';

    db.collection(range, function(err, collection) {
        if (err) throw err;
        collection.findOne( {stamp: req.params.stamp }, function(err, result) {
            if (err) throw err;
            res.type(result.header['content-type']);
            res.send(result.image.buffer);
        });
    });
}

exports.jobs = function(req, res) {
    res.render('jobs', { title: 'Job Stats' });
};

exports.jobStats = function(req, res) {
    res.send(job.map(function(e) {
        return {
            name: e.name,
            running: e.running,
            at: e.cronTime.sendAt().toLocaleString(),
            timeout: Math.floor(e.cronTime.getTimeout()/1000),
            cronTime: e.cronTime.toString()
        };
      })
    );
}

exports.data = function(req, res) {

    var period = parseInt(req.params.period) || 80;

    db.collection('OBS_SYD', function(err, collection) {
        if (err) throw err;
        var proj = { reqDate: 1, '_id': 0 };
        proj[req.params.station+'.'+req.params.stat] = 1;
        collection.find( {}, proj).sort({reqDate: -1}).limit(period).toArray(function(err, result) {
//            if (err) throw err;
            if(result[0] && result[0][req.params.station] && result[0][req.params.station][req.params.stat] != undefined) {
                var table = result.map(function(e) { return [ e.reqDate.getTime(), e[req.params.station][req.params.stat]]; });
                table.sort(function (a,b) {return a[0] - b[0];}); //(re)sort by reqDate (ascending)

                res.send({ label: req.params.station, data: table });

            } else {
                res.send({ });
            }
        });
    });
}

exports.chart = function(req, res) {
    res.render('chart', { title: 'Station Charts', tab:req.params.stat, stat: req.params.stat, stations: stations});
}

exports.radar = function(req,res) {
    res.render('radar', { title: 'Rain Radar', tab: 'radar'});
}