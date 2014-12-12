var _ = require('underscore');
var Room = require('../../../shared/models/room');
var cloudinary = require('../../../shared/cloudinary/cloudinary');

module.exports = function(req, res, next, roomname) {
  if (roomname == undefined || roomname == '') {
    res.render('404', {}, function(err, html) {
      res.send(404, html);
    });
  }

  Room.findByName('#'+roomname)
    .populate('owner', 'username avatar color location website facebook')
    .populate('op', 'username avatar color location website facebook')
    .populate('users', 'username avatar color location website facebook')
    .exec(function(err, room) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/');
      }

      if (room) {
        // avatar & poster
        room.avatar = cloudinary.roomAvatar(room._avatar(), 160, room.color);
        room.poster = cloudinary.poster(room._poster(), room.color);

        // url
        room.url = req.protocol + '://' + req.get('host') + '/room/' + room.name.replace('#', '').toLocaleLowerCase();
        room.chat = req.protocol + '://' + req.get('host') + '/!#room/' + room.name.replace('#', '');
        room.join = req.protocol + '://' + req.get('host') + '/room/join/' + room.name.replace('#', '');

        // owner
        if (room.owner && room.owner._id) {
          room.owner.avatar = cloudinary.userAvatar(room.owner._avatar(), 80, room.owner.color);
          room.owner.url = (room.owner.username)
            ? req.protocol + '://' + req.get('host') + '/user/' + room.owner.username.toLocaleLowerCase()
            : '';
          room.owner.isOwner = true;
        }

        // op
        if (room.op && room.op.length) {
          var opList = [];
          var opIds = [];
          _.each(room.op, function(op) {
            if (room.owner && room.owner._id && room.owner._id.toString() == op._id.toString()) {
              return;
            }

            op.avatar = cloudinary.userAvatar(op._avatar(), 80, op.color);
            op.url = (op.username)
              ? req.protocol + '://' + req.get('host') + '/user/' + op.username.toLocaleLowerCase()
              : '';
            op.isOp = true;
            opIds.push(op._id.toString());
            opList.push(op);
          });
          room.op = opList;
        }

        // users
        if (room.users && room.users.length) {
          var usersList = [];
          _.each(room.users, function(u) {
//            if (room.owner && room.owner._id && room.owner._id.toString() == u._id.toString())
//              return;
//            if (room.op && opIds && opIds.indexOf(u._id.toString()) !== -1)
//              return;

            u.avatar = cloudinary.userAvatar(u._avatar(), 80, u.color);
            u.url = (u.username)
              ? req.protocol + '://' + req.get('host') + '/user/' + u.username.toLocaleLowerCase()
              : '';
            usersList.push(u);
          });
          room.users = usersList;
          room.usersCount = usersList.length;
        }

        req.room = room;
        next();
      } else {
        res.render('404', {}, function(err, html) {
          res.send(404, html);
        });
      }

    });
}
