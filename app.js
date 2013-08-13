
/**
 * Module dependencies.
 */

var express = require('express')
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

/**
 * TODO: Routes should be moved into a separate routes module.
 */

    app.get('/', function(req, res) { res.redirect('/jobs'); });

    app.get('/img/:range/:stamp', pull.show);
    app.get('/imgList', pull.imgList);
    app.get('/imgList/:range/:span', pull.imgList);
    app.get('/radar', pull.radar);

    app.get('/data/:station/:stat', pull.data);
    app.get('/data/:station/:stat/:period', pull.data);
    app.get('/chart/:stat', pull.chart);

    app.get('/jobs', pull.jobStats);

http.createServer(app).listen(app.get('port'), function(){
  debug('Express server listening on port ' + app.get('port'));
});

