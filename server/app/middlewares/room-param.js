var Room = require('../models/room');
var cloudinary = require('../cloudinary');
var _ = require('underscore');

module.exports = function(req, res, next, roomname) {
  if (roomname == undefined || roomname == '') {
    res.render('404', {}, function(err, html) {
      res.send(404, html);
    });
  }

  Room.findByName('#'+roomname)
    .populate('owner', 'username avatar color location website')
    .populate('op', 'username avatar color location website')
    .exec(function(err, room) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/');
      }

      if (room) {
        // avatar & poster
        room.avatar = cloudinary.roomAvatar(room.avatar, 160, room.color);
        room.poster = cloudinary.poster(room.poster, room.color);

        // url
        room.url = req.protocol + '://' + req.get('host') + '/room/' + room.name.replace('#', '').toLocaleLowerCase();

        // owner
        if (room.owner && room.owner._id) {
          room.owner.avatar = cloudinary.userAvatar(room.owner.avatar, 80, room.owner.color);
          room.owner.url = (room.owner.username)
            ? req.protocol + '://' + req.get('host') + '/user/' + room.owner.username.toLocaleLowerCase()
            : '';
          room.owner.isOwner = true;
        }

        // op
        if (room.op && room.op.length) {
          var opList = [];
          _.each(room.op, function(op) {
            if (room.owner && room.owner._id && room.owner._id.toString() == op._id.toString()) {
              room.owner = true;
              return;
            }

            op.avatar = cloudinary.userAvatar(op.avatar, 80, op.color);
            op.url = (op.username)
              ? req.protocol + '://' + req.get('host') + '/user/' + op.username.toLocaleLowerCase()
              : '';
            op.isOp = true;
            opList.push(op);
          });
          room.op = opList;
        }

        // users @todo
        room.users = [];
        room.users_count = 0;

        req.room = room;
        next();
      } else {
        res.render('404', {}, function(err, html) {
          res.send(404, html);
        });
      }

    });
}
