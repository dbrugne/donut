var async = require('async');
var User = require('../models/user');
var Room = require('../models/room');
var cloudinary = require('../cloudinary');
var _ = require('underscore');

module.exports = function(req, res, next, username) {

  async.waterfall([

    function check(callback) {
      if (!username)
        return callback('404');

      return callback(null);
    },

    function retrieve(callback) {

      User.findByUsername(username).exec(function(err, user) {
        if (err)
          return callback(err);

        if (!user)
          return callback('404');

        return callback(null, user);
      });

    },

    function prepare(user, callback) {

      // avatar & poster
      user.avatar = cloudinary.userAvatar(user.avatar, 'user-xlarge');
      user.poster = cloudinary.userPoster(user.poster, 'user-poster');

      // url
      user.url = req.protocol + '://' + req.get('host') + '/user/' + user.username.toLocaleLowerCase();

      return callback(null, user);

    },

    function rooms(user, callback) {

      var q = Room.find({$or: [
        {owner: user._id}
      ]}, 'name owner op avatar color description')
        .populate('owner', 'username');
      q.exec(function(err, rooms) {
        if (err)
          return callback('Error while retrieving rooms for user profile: '+err);

        if (!rooms || rooms.length < 1)
          return callback(null, user);

        var list = [];

        _.each(rooms, function(dbroom) {
          var room = dbroom.toJSON();
          if (room.owner)
            room.owner.url = req.protocol + '://' + req.get('host') + '/user/' + room.owner.username.toLocaleLowerCase();

////            room.owner = room.owner.toJSON();
//            if (room.owner._id && room.owner._id.toString() == user._id.toString())
//              room.isOwner = true;
//          }
//
//          if (room.op && room.op.indexOf(user._id.toString()))
//            room.isOp = true;

          room.avatar = cloudinary.roomAvatar(room.avatar, 'room-large');
          room.url = (room.name)
            ? req.protocol + '://' + req.get('host') + '/room/' + room.name.replace('#', '').toLocaleLowerCase()
            : '';

          list.push(room);
        });

        user.roomsList = list;
        user.hasRooms = true;
        return callback(null, user);

      });
    }

  ], function(err, user) {

    if (err == '404') {
      return res.render('404', {}, function(err, html) {
        res.send(404, html);
      });
    }

    if (err) {
      req.flash('error', err);
      console.log(err);
      return res.redirect('/');
    }

    req.requestedUser = user;
    next();

  });

}