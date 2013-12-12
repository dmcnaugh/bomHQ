/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 29/08/13
 * Time: 6:16 PM
 * To change this template use File | Settings | File Templates.
 */

exports = module.exports = inject(['$app', '$passport', '$mongo'], function(app, passport, mongo) {

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

    var ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()) { return next(); }
//        res.send(403);
        res.redirect('/');
    };

    var show = function (req, res) {
        var range = req.params.range || 'IDR713';

        mongo.db.collection(range, function(err, collection) {
            if (err) throw err;
            collection.findOne( {stamp: req.params.stamp }, function(err, result) {
                if (err) throw err;
                res.type(result.header['content-type']);
                res.send(result.image.buffer);
            });
        });
    }

    app.get('/img/:range/:stamp', ensureAuthenticated, show);

    app.get('/account', ensureAuthenticated, function(req, res){
        res.render('account', { user: req.user });
    });

    exports.ensureAuthenticated = ensureAuthenticated;

    return exports;

});
