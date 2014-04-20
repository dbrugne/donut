var express = require('express');
var router = express.Router();
var Room    = require('../app/models/room');

router.get('/', function(req, res) {
    var data = {
        success: req.flash('success'),
        info: req.flash('info'),
        warning: req.flash('warning'),
        error: req.flash('error')
    };

    if (!req.isAuthenticated()) {
        return res.render('index', data);
    }

    Room.find({}, function(err, rooms) {
        if (err) {
            req.flash('error', err);
            res.redirect('/');
        }

        data.rooms = rooms;
        return res.render('welcome', data);
    });
});

router.get('/validator.min.js', function(req, res) {
    res.sendfile('node_modules/express-validator/node_modules/validator/validator.min.js');
});

module.exports = router;