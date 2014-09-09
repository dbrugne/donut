var express = require('express');
var router = express.Router();
var passport = require('passport');
var i18next = require('../app/i18next');

router.route('/connect/local')
    .get(function(req, res) {
        res.render('connect_local', { message: req.flash('signupMessage') });
    })
    .post(passport.authenticate('local-signup', {
        successRedirect : '/!', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

router.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

router.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect : '/!',
    failureRedirect : '/'
}));

router.get('/unlink/facebook', function(req, res) {
    var user = req.user;

    if (!user.local.email) {
        req.flash('warning', i18next.t("account.facebook.error.needemailpassword"));
        return res.redirect('/');
    }

    user.facebook.token = undefined;
    user.save(function(err) {
        res.redirect('/!');
    });
});

module.exports = router;