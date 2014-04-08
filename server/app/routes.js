var User    = require('./models/user');
var Room    = require('./models/room');

module.exports = function(app, passport) {

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

    app.get('/validator.min.js', function(req, res) {
        res.sendfile('node_modules/express-validator/node_modules/validator/validator.min.js');
    });

    app.get('/login', function(req, res) {

        res.locals.user = req.user;
        res.render('login', { message: req.flash('loginMessage') });

    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/account/edit',
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
    })); // @todo : should save username to !

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

        var userFields = req.user.toObject();
        res.render('account_edit', {
            userFields: userFields,
            scripts: [{src: '/validator.min.js'}]
        });
    });

    app.post('/account/edit', isLoggedIn, function(req, res) {

        console.log(req.body.user.fields);

        req.checkBody(['user', 'fields','username'],'Username should be a string of min 2 and max 25 characters.').matches(/^[-a-z0-9_\\|[\]{}^`]{2,30}$/i);
        req.checkBody(['user', 'fields','bio'],'Bio should be 70 characters max.').isLength(0, 200);
        req.checkBody(['user', 'fields','location'],'Location should be 70 characters max.').isLength(0, 70);
        if (req.body.user.fields.website){
            req.checkBody(['user', 'fields','website'],'Website should be a valid site URL').isURL();
        }

        // @todo : test username unicity
//        User.findOne({ 'username': req.body.user.fields.username }, function(err, user) {
//            if (err) {
//                req.flash('error', err)
//                return res.redirect('/');
//            }
//
//            if (user) {
//                res.render('user', {
//                    user : user
//                });
//            }
//
//        });

        var errors = req.validationErrors();
        if (errors) {
            console.log(errors);
            return res.render('account_edit', {
                userFields: req.body.user.fields,
                is_errors: true,
                errors: errors,
                scripts: [{src: '/validator.min.js'}]
            });
        }

        // @todo : validate, also on client side

         // Sanitize and set
        console.log('test chain: '+req.sanitize(['user', 'fields','username']).escape());
        req.sanitize(['user', 'fields','username']).escape();
        req.sanitize(['user', 'fields','bio']).escape();
        req.sanitize(['user', 'fields','location']).escape();
        req.sanitize(['user', 'fields','website']).escape();

        // @todo : handle file upload

        // Update user
        req.user.username = req.body.user.fields.username;
        req.user.bio = req.body.user.fields.bio;
        req.user.location = req.body.user.fields.location;
        req.user.website = req.body.user.fields.website;

        // Save
        req.user.save(function(err) {
            if (err) {
                req.flash('error', err)
                return res.redirect('/');
            } else {
                console.log('saved!');
                req.flash('success', 'Your profile was updated');
                res.redirect('/account');
            }
        });
    });

    app.post('/email', [isLoggedIn], function(req, res) {
        // @todo : implement check email format and save and return success (will close modal) or error
//        req.checkBody(['user', 'fields','email'],'Email should be a valid address.').isEmail();
//        if (req.body.user.fields.email){
//        }
//        req.user.local.email = req.body.user.fields.email;
    });

    app.post('/password', [isLoggedIn], function(req, res) {
        // @todo : implement check password, password matching, current password and save and return success (will close modal) or error
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

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/user/:username', function(req, res) {
        var username = req.params.username;
        if (username == undefined || username == '') {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

        User.findOne({ 'username': username }, function(err, user) {
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

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}