/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 9/07/13
 * Time: 4:50 PM
 * TODO: lots of tidying up to do in here, make constants configurable etc...
 */
var request = require('request');
var cron = require('cron');

exports = module.exports = inject(['$app', '$debug', '$socketIo', '$mongo'], function (app, debug, ioSrv, mongo) {

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

                        mongo.db.collection(BOM_ID, function(err, collection) {
                            if (err) throw err;
                            collection.insert( doc , function(err, result) {
                                if (err) throw err;

                                ioSrv.sockets.emit('radar', { range: BOM_ID, stamp: doc.stamp });

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

                    mongo.db.collection('OBS_SYD', function(err, collection) {
                        if (err) throw err;
                        collection.insert( doc , function(err, result) {
                            if (err) throw err;

                            doc.content = null;
                            doc.reqDate = doc.reqDate.getTime();
                            ioSrv.sockets.emit('stats', doc);

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

    return job;

});