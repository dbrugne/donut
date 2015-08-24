var _ = require('underscore');
var Room = require('../../../shared/models/room');
var conf = require('../../../config/index');

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
        room.avatar = room._avatar(160);
        room.poster = room._poster();
        room.posterBlured = room._poster(true);

        // url
        room.url = req.protocol + '://' + conf.fqdn + '/room/' + room.name.replace('#', '').toLocaleLowerCase();
        room.chat = req.protocol + '://' + conf.fqdn + '/!#room/' + room.name.replace('#', '');
        room.join = req.protocol + '://' + conf.fqdn + '/room/join/' + room.name.replace('#', '');

        // owner
        if (room.owner && room.owner._id) {
          room.owner.avatar = room.owner._avatar(80);
          room.owner.url = (room.owner.username)
            ? req.protocol + '://' + conf.fqdn + '/user/' + (''+room.owner.username).toLocaleLowerCase()
            : '';
          room.owner.isOwner = true;
          room.owner.isOp = false; // could not be both
        }

        // op
        if (room.op && room.op.length) {
          var opList = [];
          var opIds = [];
          _.each(room.op, function(op) {
            if (room.owner && room.owner._id && room.owner.id == op.id) {
              return;
            }

            op.avatar = op._avatar(80);
            op.url = (op.username)
              ? req.protocol + '://' + conf.fqdn + '/user/' + (''+op.username).toLocaleLowerCase()
              : '';
            op.isOp = true;
            op.isOwner = false;
            opIds.push(op._id.toString());
            opList.push(op);
          });
          room.op = opList;
        }

        // users
        if (room.users && room.users.length) {
          var usersList = [];
          _.each(room.users, function(u) {
            if (room.owner && room.owner._id && room.owner.id == u.id)
              return;
            if (room.op && opIds && opIds.indexOf(u._id.toString()) !== -1)
              return;

            u.avatar = u._avatar(80);
            u.url = (u.username)
              ? req.protocol + '://' + conf.fqdn + '/user/' + (''+u.username).toLocaleLowerCase()
              : '';
            u.isOp = false;
            u.isOwner = false;
            usersList.push(u);
          });
          room.users = usersList;
          room.usersCount = usersList.length;
        }

        req.room = room;
        next();
      } else {
        res.render('404', {}, function(err, html) {
          res.status(404).send(html);
        });
      }

    });
}
