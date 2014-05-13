var express = require('express');
var router = express.Router();
var User = require('../app/models/user');

// USER PROFILE
// ==============================================
router.param('user', function(req, res, next, username) {
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
            req.requestedUser = user;
            next();
        } else {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

    });
});
router.get('/user/:user', function(req, res) {
    res.render('user-profile', {
      requestedUser: req.requestedUser,
      avatarUrl: req.requestedUser.avatarUrl('large')
    });
});

module.exports = router;