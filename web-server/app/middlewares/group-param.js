'use strict';
var _ = require('underscore');
var GroupModel = require('../../../shared/models/group');
var RoomModel = require('../../../shared/models/room');
var logger = require('pomelo-logger').getLogger('web', __filename);

module.exports = function (req, res, next, groupname) {
  if (groupname === undefined || groupname === '') {
    res.render('404', {}, function (err, html) {
      if (err) {
        logger.debug(err);
      }
      res.send(404, html);
    });
  }

  GroupModel.findByName(groupname)
    .populate('owner', 'username avatar location website facebook')
    .populate('op', 'username avatar location website facebook')
    .exec(function (err, model) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }

      if (model) {
        var group = {
          id: model.id,
          name: model.name,
          avatar: model._avatar(160),
          disclaimer: model.disclaimer,
          website: model.website,
          created_at: model.created_at
        };

        // owner
        var ownerId;
        if (model.owner && model.owner._id) {
          ownerId = model.owner.id;
          group.owner = {
            id: model.owner.id,
            username: model.owner.username,
            avatar: model.owner._avatar(80),
            is_owner: true,
            is_op: false // could not be both
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
              is_op: true,
              is_owner: false
            };

            opIds.push(_model.id);
            opList.push(op);
          });
          group.op = opList;
        }

        group.membersCount = 1; // owner
        group.membersCount += (group.op)
          ? group.op.length
          : 0;
        group.membersCount += (model.members)
          ? model.members.length
          : 0;

        // populate rooms
        RoomModel.findByGroup(group.id).populate({
          path: 'owner',
          select: 'username'
        }).exec(function (err, rooms) {
          if (err) {
            req.flash('error', err);
            return res.redirect('/');
          }

          var sanitizedRooms = [];
          _.each(rooms, function (r) {
            if (r.mode !== 'public' && ((req.user && !req.user.admin && !model.isMember(req.user._id.toString())) || !req.user)) {
              return;
            }

            var room = {
              id: r.id,
              group_name: group.name,
              room_id: r.id,
              avatar: r._avatar(160),
              mode: r.mode,
              name: r.name,
              users: (r.users)
                ? r.users.length
                : 0
            };

            if (r.owner) {
              room.owner = {
                user_id: r.owner.id,
                username: r.owner.username,
                is_owner: true,
              };
            }

            sanitizedRooms.push(room);
          });

          group.rooms = sanitizedRooms;
          req.group = group;
          next();
        });
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
