
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

/**
 * GLOBALS
 */
debug = require('express/node_modules/debug')('bom');
app = express();

var pull = require('./routes/pull');


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
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/img/:range/:stamp', pull.show);
app.get('/imgList', pull.imgList);
app.get('/imgList/:range/:span', pull.imgList);
app.get('/radar', pull.radar);

app.get('/stats', pull.jobStats);
app.get('/data/:station/:stat', pull.data);
app.get('/data/:station/:stat/:period', pull.data);
app.get('/plot/:station/:stat', pull.plot);
app.get('/chart/:stat', pull.chart);

http.createServer(app).listen(app.get('port'), function(){
  debug('Express server listening on port ' + app.get('port'));
});

