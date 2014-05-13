var express = require('express');
var router = express.Router();
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
    res.render('room-profile', {
        room: req.room
    });
});

module.exports = router;