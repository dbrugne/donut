var User    = require('./models/user');
var Room    = require('./models/room');

module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (authenticated or not) ====
    // =====================================
    app.get('/', function(req, res) {

        res.locals.user = req.user;

        if (!req.isAuthenticated()) {
            res.render('index', { });
        } else {
            res.render('welcome', { });
        }

    });

    // =====================================
    // USER ================================
    // =====================================
    app.get('/login', function(req, res) {

        res.locals.user = req.user;
        res.render('login', { message: req.flash('loginMessage') });

    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/signup', function(req, res) {

        res.locals.user = req.user;
        res.render('signup', { message: req.flash('signupMessage') });

    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

    app.get('/account', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        res.render('account', {});
    });

    app.get('/account/edit', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        res.render('account_edit', {});
        // @todo : implement form + JS validation
    });

    app.post('/account/edit', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        // @todo : validate, sanitize and save then redirect on account/
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // Facebook: route authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // Facebook: handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/account',
            failureRedirect : '/'
        }));

    // Facebook: route for logging out
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // PROFILES ============================
    // =====================================

    app.get('/user/:username', function(req, res) {
        var username = req.params.username;
        if (username == undefined || username == '') {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

        User.findOne({ 'local.username': username }, function(err, user) {
            if (err) {
                req.flash('info', err)
                res.redirect('/');
            }

            if (user) {
                res.render('user', {
                    user : user
                });
            } else {
                res.render('404', {}, function(err, html) {
                    res.send(404, html);
                });
            }

        });
    });

};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}