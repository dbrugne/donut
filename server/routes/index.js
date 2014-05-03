var express = require('express');
var router  = express.Router();
var Room    = require('../app/models/room');

router.get('/', function(req, res) {
    if (!req.isAuthenticated()) {
        return res.render('index', {});
    }

    Room.find({}, function(err, rooms) {
        if (err) {
          return res.send('Error'+err);
        }

        var data = {rooms: rooms};
      console.log(data);
        return res.render('welcome', data);
    });
});

router.get('/validator.min.js', function(req, res) {
    res.sendfile('node_modules/express-validator/node_modules/validator/validator.min.js');
});

module.exports = router;