var express = require('express');
var router = express.Router();

var paramHandler = require('../app/middlewares/room-param');
router.param('room', paramHandler);

router.get('/room/:room', function(req, res) {
    var isOwner = (req.user._id.toString() == req.room.owner._id.toString())
      ? true
      : false;

    res.render('room_profile', {
      room: req.room,
      avatarUrl: req.room.avatarUrl('large'),
      ownerAvatarUrl: req.user.avatarUrl('small'),
      isOwner: isOwner,
      uri: req.room.name.replace('#', ''),
      scripts: [
        {src: '/javascripts/plugins/jquery.linkify.min.js'}
      ]
    });
});

module.exports = router;