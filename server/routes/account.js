var express = require('express');
var router = express.Router();
var isLoggedIn = require('../app/middlewares/isloggedin');
var Room = require('../app/models/room');

router.get('/account', isLoggedIn, function(req, res) {

  var onSuccess = function(err, rooms) {
    if (err) {
      console.log(err);
      req.flash('error', err)
      return res.redirect('/');
    }

    var json = [];
    for (var i=0; i<rooms.length; i++) {
      var _json = rooms[i].toJSON();
      _json.uri = _json.name.replace('#', '');
      json.push(_json);
    }

    return res.render('account', {
      avatarUrl: req.user.avatarUrl('medium'),
      rooms: json
    });
  };

  Room.find({owner: req.user._id.toString()}, onSuccess);

});

module.exports = router;