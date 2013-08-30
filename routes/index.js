/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 29/08/13
 * Time: 6:16 PM
 * To change this template use File | Settings | File Templates.
 */

var pull = require('./pull'); //TODO: this should have a DI of app.

exports = module.exports = function(app, passport) {

    app.get('/', function(req, res) {
        res.render('index', { title: 'BOM stats', user: req.user})
    });

    // GET /auth/google
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in Google authentication will involve redirecting
    //   the user to google.com.  After authenticating, Google will redirect the
    //   user back to this application at /auth/google/return
    app.get('/auth/google',
        passport.authenticate('google', { failureRedirect: '/' }),
        function(req, res) {
            res.redirect('/');
        }
    );

    app.get('/auth/google/return',
        passport.authenticate('google', { failureRedirect: '/' }),
        function(req, res) {
            res.redirect('/');
        }
    );

    app.get('/auth/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    /**
     * Protected routes, i.e. must be an authenticated user to access these routes, including static content
     */

    this.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()) { return next(); }
//        res.send(403);
        res.redirect('/');
    };

    app.get('/img/:range/:stamp', this.ensureAuthenticated, pull.show);

    app.get('/account', this.ensureAuthenticated, function(req, res){
        res.render('account', { user: req.user });
    });

    return this;

};
