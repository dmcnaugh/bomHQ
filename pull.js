/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 9/07/13
 * Time: 4:50 PM
 * To change this template use File | Settings | File Templates.
 */
var request = require('request');
var mongo = require('mongodb');
var cron = require('cron');

var BSON = mongo.BSONPure;

var MongoClient = mongo.MongoClient;
var db;

var mongoConn = [
    'mongodb://localhost/weather',
    'mongodb://app:app@wp.mackeneight.net:27017/weather',
    'mongodb://app:app@ds031978.mongolab.com:31978/weather'
];

var conn = process.env.MONGODB || mongoConn[0];

MongoClient.connect(conn, { server: { auto_reconnect: true, socketOptions: { keepAlive: 1}}}, function(err, dbc) {
    if (err) throw err;
    db = dbc;
    console.log("Connected to " + db.options.url + " : " + db.databaseName + " database");
});

function pad2(number) {
    return (number < 10 ? '0' : '') + number
}

var REQ = function(BOM_ID) {

    BOM_ID = BOM_ID || 'IDR712';

    var imgFile= "http://www.bom.gov.au/radar/" + BOM_ID + ".T.";

    var doc = {};

    doc.reqDate = new Date();
    console.log('REQ:'+doc.reqDate.toUTCString());

    doc.stamp = doc.reqDate.getUTCFullYear().toString();
    doc.stamp += pad2(doc.reqDate.getUTCMonth()+1);
    doc.stamp += pad2(doc.reqDate.getUTCDate());
    doc.stamp += pad2(doc.reqDate.getUTCHours());
    doc.stamp += pad2(Math.floor(doc.reqDate.getUTCMinutes()/6)*6);
    console.log('REQ:'+doc.stamp);

    doc.imgFile = imgFile + doc.stamp + '.png';
    console.log('REQ:'+doc.imgFile);

    request({url: doc.imgFile, method: 'HEAD'}, function (error, response, body) {
        /*
         *TODO: need to cope with error conditions here
         */
        console.log(error);
        console.log('BOM:'+response.statusCode);
        console.log('BOM:'+response.headers.date);
//        console.log((body.length/1024).toFixed(2)+'Kb');
        if (!error && response.statusCode == 200) {
            /*
             * encoding: null - forces the request() to return body as a buffer (not string)
             */
            request({url: doc.imgFile, method: 'GET', encoding: null}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
//                    console.log(response.headers['content-type']);
//                    console.log((body.length/1024).toFixed(2)+'Kb');
//                    console.log(body.length);
//                    console.log(typeof body);
//                    console.log(Buffer.isBuffer(body));

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

var STATS = function() {

    var source = "http://www.bom.gov.au/nsw/observations/sydney.shtml";
    var doc = {};

    doc.reqDate = new Date();

    var stations = [ 'canterbury' , 'sydney-observatory-hill', 'sydney-olympic-park'];

    var temp = "<td headers=\"obs-temp obs-station-%STN%\"> *([0-9]*\\.[0-9]+) *</td>";
    var rain = "<td headers=\"obs-rainsince9am obs-station-%STN%\"> *([0-9]*\\.[0-9]+) *</td>";
    var hum = "<td headers=\"obs-relhum obs-station-%STN%\"> *([0-9]+) *</td>";
    var press = "<td headers=\"obs-press obs-station-sydney-observatory-hill\"> *([0-9]*\\.[0-9]+) *</td>"

    var tempRE = new RegExp(temp.replace('%STN%', stations[0]));
    var rainRE = new RegExp(temp.replace('%STN%', stations[0]));
    var humRE = new RegExp(hum.replace('%STN%', stations[0]));

    request({url: source, method: 'HEAD'}, function (error, response, body) {
        /*
         *TODO: need to cope with error conditions here
         */
        console.log(error);
        console.log('STATS:'+response.statusCode);
        console.log('STATS:'+response.headers.date);
//        console.log('STATS:'+(body.length/1024).toFixed(2)+'Kb');
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


//STATS();
//setInterval(REQ, 60000);

/**
 * OLD NODE-SCHEDULE CODE

var rule = new schedule.RecurrenceRule();
//rule.dayOfWeek = [0, new schedule.Range(4, 6)];
//rule.hour = 17;
//rule.minute = 0;
rule.minute = [];
for(var i = 5; i < 60; i += 6) {
    rule.minute.push(i);
}

var bomTargets = [ 'IDR712', 'IDR713', 'IDR714' ];

//console.log(rule);

var job = [];

job[0] = schedule.scheduleJob(bomTargets[0], rule, function() { REQ(bomTargets[0]); });    rule.second += 15;
job[1] = schedule.scheduleJob(bomTargets[1], rule, function() { REQ(bomTargets[1]); });    rule.second += 15;
job[2] = schedule.scheduleJob(bomTargets[2], rule, function() { REQ(bomTargets[2]); });    rule.second += 15;
job[3] = schedule.scheduleJob('STATS', rule, function() { STATS(); });
 */

var bomTargets = [ 'IDR712', 'IDR713', 'IDR714' ];
var job = [];

job[0] = new cron.CronJob('0 5-59/6 * * * *', function() { REQ(bomTargets[0]); }); job[0].start();
job[0].name = bomTargets[0];
job[1] = new cron.CronJob('15 5-59/6 * * * *', function() { REQ(bomTargets[1]); }); job[1].start();
job[1].name = bomTargets[1];
job[2] = new cron.CronJob('30 5-59/6 * * * *', function() { REQ(bomTargets[2]); }); job[2].start();
job[2].name = bomTargets[2];
job[3] = new cron.CronJob('45 5-59/6 * * * *', function() { STATS(); }); job[3].start();
job[3].name = 'STATS';


exports.show = function(req, res) {
    db.collection('IDR712', function(err, collection) {
        if (err) throw err;
        collection.findOne( { }, function(err, result) {
            if (err) throw err;
            res.type(result.header['content-type']);
            res.send(result.image.buffer);
            console.log(result.image.buffer.length)
        });
    });
}

exports.jobStats = function(req, res) {

//    for(var i = 0; i < job.length; i++) {
//        job[i].go = job[i].running;
//        job[i].len = job[i].cronTime.source;
//    }

    res.render('jobs', { title: 'Job Stats', jobs: job });
}