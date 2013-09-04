/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 31/08/13
 * Time: 9:48 PM
 * To change this template use File | Settings | File Templates.
 */
var mongo = require('mongodb');

exports = module.exports = thankYou(function($debug, $app) {

    var MongoClient = mongo.MongoClient;
    var db = null;

    var mongoConn = [
        'mongodb://localhost/weather',
        'mongodb://debian-box.local/weather',
        'mongodb://app:app@wp.mackeneight.net:27017/weather',
        'mongodb://app:app@ds031978.mongolab.com:31978/weather'
    ];

    if ('development' == $app.get('env')) {
        var conn = mongoConn[1];
    } else {
        var conn = process.env.MONGODB || mongoConn[0];
    }

    MongoClient.connect(conn, { server: { auto_reconnect: true, socketOptions: { keepAlive: 1}}}, function(err, dbc) {
        if (err) throw 'MongoDB Error: Failed to connect to: ' + conn;
        db = dbc;
        $debug("Connected to " + dbc.options.url + " : " + dbc.databaseName + " database");
    });

    exports.__defineGetter__('db', function () { return db }); //TODO: some sugar here would be sweet

    return exports;

});