
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var request = require('request');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
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

function pad2(number) {
    return (number < 10 ? '0' : '') + number
}

var REQ = function() {

    var imgFile="http://www.bom.gov.au/radar/IDR712.T.";

    var reqDate = new Date();
    console.log(reqDate.toUTCString());
    imgFile += reqDate.getUTCFullYear();
    imgFile += pad2(reqDate.getUTCMonth()+1);
    imgFile += pad2(reqDate.getUTCDate());
    imgFile += pad2(reqDate.getUTCHours());
    imgFile += pad2(Math.floor(reqDate.getUTCMinutes()/6)*6);
    imgFile += '.png';
    console.log(imgFile);

    request({url: imgFile, method: 'HEAD'}, function (error, response, body) {
        console.log(error);
        console.log('SRV:'+response.statusCode);
        console.log('SRV:'+response.headers.date)
        console.log((body.length/1024).toFixed(2)+'Kb');
        if (!error && response.statusCode == 200) {
            request({url: imgFile, method: 'GET'}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(response.headers['content-type']);
                    console.log((body.length/1024).toFixed(2)+'Kb');
                }
            });
        }
    });
};

setInterval(REQ, 60000);

//http.createServer(app).listen(app.get('port'), function(){
//  console.log('Express server listening on port ' + app.get('port'));
//});

