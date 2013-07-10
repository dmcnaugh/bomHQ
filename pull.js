/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 9/07/13
 * Time: 4:50 PM
 * To change this template use File | Settings | File Templates.
 */
var request = require('request');
var mongo = require('mongodb');

var BSON = mongo.BSONPure;

var MongoClient = mongo.MongoClient;
var db;

var mongoConn = [
    'mongodb://localhost/weather',
    'mongodb://app:app@wp.mackeneight.net:27017/contacts',
    'mongodb://app:app@ds031978.mongolab.com:31978/contacts'
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

var REQ = function() {

    var imgFile="http://www.bom.gov.au/radar/IDR712.T.";

    var doc = {};

    doc.reqDate = new Date();
    console.log(doc.reqDate.toUTCString());
    imgFile += doc.reqDate.getUTCFullYear();
    imgFile += pad2(doc.reqDate.getUTCMonth()+1);
    imgFile += pad2(doc.reqDate.getUTCDate());
    imgFile += pad2(doc.reqDate.getUTCHours());
    imgFile += pad2(Math.floor(doc.reqDate.getUTCMinutes()/6-1)*6);
    imgFile += '.png';
    console.log(imgFile);
    doc.imgFile = imgFile;

    request({url: imgFile, method: 'HEAD'}, function (error, response, body) {
        console.log(error);
        console.log('SRV:'+response.statusCode);
        console.log('SRV:'+response.headers.date)
        console.log((body.length/1024).toFixed(2)+'Kb');
        if (!error && response.statusCode == 200) {
            /*
             * encoding: null - forces the request() to return body as a buffer (not string)
             */
            request({url: imgFile, method: 'GET', encoding: null}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(response.headers['content-type']);
//                    console.log((body.length/1024).toFixed(2)+'Kb');
                    console.log(body.length);
                    console.log(typeof body);
                    console.log(Buffer.isBuffer(body));

                    doc.header = response.headers;
                    doc.image = body;

                    db.collection('R256', function(err, collection) {
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

REQ();
//setInterval(REQ, 60000);

exports.show = function(req, res) {
    db.collection('R256', function(err, collection) {
        if (err) throw err;
        collection.findOne( { }, function(err, result) {
            if (err) throw err;
            res.type(result.header['content-type']);
            res.send(result.image.buffer);
            console.log(result.image.buffer.length)
        });
    });
}