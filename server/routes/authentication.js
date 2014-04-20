var express = require('express');
var router = express.Router();
var passport = require('passport');

router.route('/signup')
    .get(function(req, res) {
        res.locals.user = req.user;
        res.render('signup', { message: req.flash('signupMessage') });

    })
    .post(passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

router.route('/login')
    .get(function(req, res) {
        res.locals.user = req.user;
        res.render('login', { message: req.flash('loginMessage') });
    })
    .post(passport.authenticate('local-login', {
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

router.get('/login/facebook', passport.authenticate('facebook', {
    scope : 'email'
}));

router.get('/login/facebook/callback', passport.authenticate('facebook', {
        successRedirect : '/account',
        failureRedirect : '/'
}));

router.route('/connect/local')
    .get(function(req, res) {
        res.locals.user = req.user;
        res.render('connect_local', { message: req.flash('signupMessage') });
    })
    .post(passport.authenticate('local-signup', {
        successRedirect : '/account', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

router.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

router.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect : '/account',
    failureRedirect : '/'
}));

router.get('/unlink/facebook', function(req, res) {
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

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;