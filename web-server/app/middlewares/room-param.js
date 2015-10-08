'use strict';
var _ = require('underscore');
var Room = require('../../../shared/models/room');
var logger = require('pomelo-logger').getLogger('web', __filename);
var urls = require('../../../shared/util/url');

module.exports = function (req, res, next, roomname) {
  if (roomname === undefined || roomname === '') {
    res.render('404', {}, function (err, html) {
      if (err) {
        logger.debug(err);
      }
      res.send(404, html);
    });
  }

  Room.findByName(roomname)
    .populate('group', 'name')
    .populate('owner', 'username avatar color location website facebook')
    .populate('op', 'username avatar color location website facebook')
    .populate('users', 'username avatar color location website facebook')
    .exec(function (err, model) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }

      if (model) {
        var room = {
          id: model.id,
          name: model.name,
          identifier: model.getIdentifier(),
          permanent: model.permanent,
          avatar: model._avatar(160),
          poster: model._poster(),
          posterBlured: model._poster(true),
          color: model.color,
          topic: model.topic,
          description: model.description,
          website: model.website,
          created_at: model.created_at,
          lastjoin_at: model.lastjoin_at,
          activity: model.activity,
          mode: model.mode
        };

        if (model.group) {
          room.group_name = model.group.name;
          room.group_id = model.group.id;
        }

        // urls
        var data = urls(room, 'room', req.protocol);
        room.url = data.url;
        room.chat = data.chat;
        room.join = data.join;

        // owner
        var ownerId;
        if (model.owner && model.owner._id) {
          ownerId = model.owner.id;
          room.owner = {
            id: model.owner.id,
            username: model.owner.username,
            avatar: model.owner._avatar(80),
            color: model.owner.color,
            url: (model.owner.username)
              ? urls(model.owner, 'user', req.protocol, 'url')
              : '',
            isOwner: true,
            isOp: false // could not be both
          };
        }

        // op
        var opIds = [];
        if (model.op && model.op.length) {
          var opList = [];
          _.each(model.op, function (_model) {
            if (ownerId && ownerId === _model.id) {
              return;
            }

            var op = {
              id: _model.id,
              username: _model.username,
              avatar: _model._avatar(80),
              color: _model.color,
              url: (_model.username)
                ? urls(_model, 'user', req.protocol, 'url')
                : '',
              isOp: true,
              isOwner: false
            };

            opIds.push(_model.id);
            opList.push(op);
          });
          room.op = opList;
        }

        // users
        if (model.users && model.users.length) {
          var usersList = [];
          _.each(model.users, function (_model) {
            if (ownerId && ownerId === _model.id) {
              return;
            }
            if (opIds && opIds.indexOf(_model.id) !== -1) {
              return;
            }

            var user = {
              id: _model.id,
              username: _model.username,
              avatar: _model._avatar(80),
              color: _model.color,
              url: (_model.username)
                ? urls(_model, 'user', req.protocol, 'url')
                : '',
              isOp: false,
              isOwner: false
            };
            usersList.push(user);
          });
          room.users = usersList;
          room.usersCount = (room.op) ? usersList.length + room.op.length + 1 : usersList.length + 1;
        }

        req.room = room;
        next();
      } else {
        res.render('404', {}, function (err, html) {
          if (err) {
            logger.debug(err);
          }
          res.status(404).send(html);
        });
      }
    });
};
