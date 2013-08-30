
/**
 * Module dependencies.
 */

var express = require('express')
    , http = require('http')
    , path = require('path')
    , passport = require('passport')
    , GoogleStrategy = require('passport-google').Strategy
    , io = require('socket.io');

/**
 * GLOBALS
 */
debug = require('express/node_modules/debug')('bom'); // TODO: should not have to be global - currently referenced in routes/pull.js - use DI of (debug) instead
app = express(); // TODO: should not have to be global - currently referenced in routes/pull.js - use DI of (app) instead

var httpSrv = http.createServer(app);

ioSrv = io.listen(httpSrv);
if ('production' == app.get('env')) {
    ioSrv.set('log level', 1);
}

var api = require('./routes/socketApi')(ioSrv);

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new GoogleStrategy({
        // TODO: must cope with changing hostname and port numbers here
        returnURL: 'http://localhost:3000/auth/google/return',
        realm: 'http://localhost:3000/'
    },
    function(identifier, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            profile.identifier = identifier;
            return done(null, profile);
        });
    }
));

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
app.use(express.cookieParser());
app.use(express.session({ secret: 'animal farm'})); //TODO: use a better secret

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);
var routes = require('./routes')(app, passport); // TODO: is this correct DI for app & passport?

/**
 * The following static content is exposed when not authenticated
 * TODO: maybe this is better done with a separation of paths e.g. public vs. protected
 */
app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/lib/bootstrap', express.static(path.join(__dirname, 'public/lib/bootstrap')));
app.use('/lib/font-awesome', express.static(path.join(__dirname, 'public/lib/font-awesome')));
/**
 * All remaining static content is only accessible once the user is authenticated
 */
app.use(routes.ensureAuthenticated);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

httpSrv.listen(app.get('port'), function() {
  debug('Express server listening on port ' + app.get('port'));
});