
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
    , io = require('socket.io');

/**
 * GLOBALS
 */
debug = require('express/node_modules/debug')('bom');
app = express();

var httpSrv = http.createServer(app);
ioSrv = io.listen(httpSrv);
//ioSrv.set('log level', 1);

var pull = require('./routes/pull');
var api = require('./routes/socketApi')(ioSrv);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
if ('development' == app.get('env')) {
    app.use(express.logger('dev'));
}
app.use(express.bodyParser());
app.use(express.methodOverride());
//app.use(express.cookieParser('your secret here'));
//app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/**
 * TODO: Routes should be moved into a separate routes module.
 */

//    app.get('/', function(req, res) { res.render('layout') });

    app.get('/img/:range/:stamp', pull.show);
//    app.get('/Radar', pull.radar);
//
//    app.get('/Chart', pull.chart)
//
//    app.get('/Jobs', pull.jobs);

httpSrv.listen(app.get('port'), function(){
  debug('Express server listening on port ' + app.get('port'));
});

