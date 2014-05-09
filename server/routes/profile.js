var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var Room = require('../app/models/room');

// ROOM PROFILE
// ==============================================
router.param('room', function(req, res, next, roomname) {
    if (roomname == undefined || roomname == '') {
        res.render('404', {}, function(err, html) {
            res.send(404, html);
        });
    }

    Room.findOne({ name: '#'+roomname }, function(err, room) {
        if (err) {
            req.flash('error', err)
            return res.redirect('/');
        }

        if (room) {
            req.room = room;
            next();
        } else {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

    });
});
router.get('/room/:room', function(req, res) {
    res.render('room', {
        room: req.room
    });
});

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
            user.avatarUrl = user.avatarUrl();
            next();
        } else {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

    });
});
router.get('/user/:user', function(req, res) {
    console.log(req.requestedUser);
    res.render('user', {
        user : req.requestedUser
    });
});

module.exports = router;