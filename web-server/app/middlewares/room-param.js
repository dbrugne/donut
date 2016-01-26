'use strict';
var _ = require('underscore');
var Room = require('../../../shared/models/room');
var Group = require('../../../shared/models/group');
var logger = require('pomelo-logger').getLogger('web', __filename);
var urls = require('../../../shared/util/url');
var conf = require('../../../config/index');

module.exports = function (req, res, next, roomname) {
  if (roomname === undefined || roomname === '') {
    res.render('404', {}, function (err, html) {
      if (err) {
        logger.debug(err);
      }
      res.send(404, html);
    });
  }

  Group.findByName(req.params.group)
    .exec(function (err, group) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }

      var id = (group) ? group.id : null;
      Room.findByNameAndGroup(roomname, id)
        .populate('group', 'name')
        .populate('owner', 'username avatar location website facebook')
        .populate('op', 'username avatar location website facebook')
        .populate('users', 'username avatar location website facebook')
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
              topic: model.topic,
              description: model.description,
              website: model.website,
              created_at: model.created_at,
              activity: model.activity,
              mode: model.mode,
              allow_user_request: model.allow_user_request,
              allow_group_member: model.allow_group_member
            };

            if (model.group) {
              room.group_name = model.group.name;
              room.group_id = model.group.id;
            }

            // urls
            var data = urls(room, 'room');
            room.url = req.protocol + '://' + conf.fqdn + data.url;
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
                chat: (model.owner.username)
                  ? req.protocol + '://' + conf.fqdn + urls(model.owner, 'user', 'chat')
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
                  chat: (_model.username)
                    ? req.protocol + '://' + conf.fqdn + urls(_model, 'user', 'chat')
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
                  chat: (_model.username)
                    ? req.protocol + '://' + conf.fqdn + urls(_model, 'user', 'chat')
                    : '',
                  isOp: false,
                  isOwner: false
                };
                usersList.push(user);
              });
              room.users = usersList;
              room.usersCount = (room.op)
                ? usersList.length + room.op.length + 1
                : usersList.length + 1;
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
    });
};
