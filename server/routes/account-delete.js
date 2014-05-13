var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/isloggedin');

router.get('/account/delete', isLoggedIn, function(req, res) {
    var user = req.user;
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

module.exports = router;