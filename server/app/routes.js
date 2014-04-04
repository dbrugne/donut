var User    = require('./models/user');
var Room    = require('./models/room');

module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (authenticated or not) ====
    // =====================================
    app.get('/', function(req, res) {

        res.locals.user = req.user;

        var data = {
            success: req.flash('success'),
            info: req.flash('info'),
            warning: req.flash('warning'),
            error: req.flash('error')
        };
        if (!req.isAuthenticated()) {
            res.render('index', data);
        } else {
            res.render('welcome', data);
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
        var data = {
            success: req.flash('success'),
            info: req.flash('info'),
            warning: req.flash('warning'),
            error: req.flash('error')
        };
        res.render('account', data);
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
        })
    );

    // =============================================================================
    // AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
    // =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function(req, res) {
        res.locals.user = req.user;
        res.render('connect_local', { message: req.flash('signupMessage') });
    });

    app.post('/connect/local', passport.authenticate('local-signup', {
        successRedirect : '/account', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // facebook -------------------------------
    // send to facebook to do the authentication
    app.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

    // handle the callback after facebook has authorized the user
    app.get('/connect/facebook/callback',
        passport.authorize('facebook', {
            successRedirect : '/account',
            failureRedirect : '/'
        })
    );

    // local -----------------------------------
    app.get('/user/delete', isLoggedIn, function(req, res) {
        var user = req.user;
        // @todo : remove files (avatars?)
        user.remove(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            }

            req.logout();
            req.flash('success', 'Account successfully deleted');
            res.redirect('/');
        });
    });

    // facebook -------------------------------
    app.get('/unlink/facebook', function(req, res) {
        var user = req.user;

        if (!user.local.email) {
            req.flash('warning', 'You cannot remove your Facebook account until you have defined a local email and password.'
                +' If you want to remove all your data from the platform use the delete button');
            return res.redirect('/account');
        }

        user.facebook.token = undefined;
        user.save(function(err) {
            res.redirect('/account');
        });
    });

    // route for logging out
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
                req.flash('error', err)
                return res.redirect('/');
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