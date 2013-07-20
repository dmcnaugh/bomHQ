/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 9/07/13
 * Time: 4:50 PM
 * To change this template use File | Settings | File Templates.
 */
var request = require('request');
var mongo = require('mongodb');
var schedule = require('node-schedule');

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
        console.log('BOM:'+response.headers.date)
        console.log((body.length/1024).toFixed(2)+'Kb');
        if (!error && response.statusCode == 200) {
            /*
             * encoding: null - forces the request() to return body as a buffer (not string)
             */
            request({url: doc.imgFile, method: 'GET', encoding: null}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(response.headers['content-type']);
//                    console.log((body.length/1024).toFixed(2)+'Kb');
                    console.log(body.length);
                    console.log(typeof body);
                    console.log(Buffer.isBuffer(body));

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

//REQ();
//setInterval(REQ, 60000);

var rule = new schedule.RecurrenceRule();
//rule.dayOfWeek = [0, new schedule.Range(4, 6)];
//rule.hour = 17;
//rule.minute = 0;
rule.minute = [];
for(var i = 5; i < 60; i += 6) {
    rule.minute.push(i);
}

var bomTargets = [ 'IDR712', 'IDR713', 'IDR714' ];

console.log(rule);

var job = [];

job[0] = schedule.scheduleJob(rule, function() { REQ(bomTargets[0]); });
job[1] = schedule.scheduleJob(rule, function() { REQ(bomTargets[1]); });
job[2] = schedule.scheduleJob(rule, function() { REQ(bomTargets[2]); });

for (var i = 0; i < bomTargets.length; i++) {

    console.log('JOB:'+bomTargets[i]);
    console.log(job[i]);
//    rule.second += 20;

};


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