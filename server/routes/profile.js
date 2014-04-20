var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var Room = require('../app/models/room');

router.get('/room/:name', function(req, res) {
    var name = req.params.name;
    if (name == undefined || name == '') {
        res.render('404', {}, function(err, html) {
            res.send(404, html);
        });
    }

    // @todo: move in param middleware (will handle 404)
    Room.findOne({ 'name': name }, function(err, room) {
        if (err) {
            req.flash('error', err)
            return res.redirect('/');
        }

        if (room) {
            res.render('room', {
                room : room
            });
        } else {
            res.render('404', {}, function(err, html) {
                res.send(404, html);
            });
        }

    });
});

router.get('/user/:username', function(req, res) {
    var username = req.params.username;
    if (username == undefined || username == '') {
        res.render('404', {}, function(err, html) {
            res.send(404, html);
        });
    }

    // @todo: move in param middleware (will handle 404)
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

module.exports = router;