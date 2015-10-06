'use strict';
var _ = require('underscore');
var GroupModel = require('../../../shared/models/group');
var RoomModel = require('../../../shared/models/room');
var conf = require('../../../config/index');
var logger = require('../../../shared/util/logger').getLogger('web', __filename);

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
    .populate('owner', 'username avatar color location website facebook')
    .populate('op', 'username avatar color location website facebook')
    //.populate('members', 'username avatar color location website facebook')
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
          color: model.color,
          disclaimer: model.disclaimer,
          website: model.website,
          created_at: model.created_at
        };

        // urls
        group.url = req.protocol + '://' + conf.fqdn + '/group/' + group.name;
        group.chat = req.protocol + '://' + conf.fqdn + '/!' + group.name;
        group.join = req.protocol + '://' + conf.fqdn + '/group/join/' + group.name;

        // owner
        var ownerId;
        if (model.owner && model.owner._id) {
          ownerId = model.owner.id;
          group.owner = {
            id: model.owner.id,
            username: model.owner.username,
            avatar: model.owner._avatar(80),
            color: model.owner.color,
            url: (model.owner.username)
              ? req.protocol + '://' + conf.fqdn + '/user/' + ('' + model.owner.username).toLocaleLowerCase()
              : '',
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
              color: _model.color,
              url: (_model.username)
                ? req.protocol + '://' + conf.fqdn + '/user/' + ('' + _model.username).toLocaleLowerCase()
                : '',
              is_op: true,
              is_owner: false
            };

            opIds.push(_model.id);
            opList.push(op);
          });
          group.op = opList;
        }

        // members
        //if (model.members && model.members.length) {
        //  var members = [];
        //  _.each(model.members, function (_model) {
        //    if (ownerId && ownerId === _model.id) {
        //      return;
        //    }
        //    if (opIds && opIds.indexOf(_model.id) !== -1) {
        //      return;
        //    }
        //
        //    var user = {
        //      id: _model.id,
        //      username: _model.username,
        //      avatar: _model._avatar(80),
        //      color: _model.color,
        //      url: (_model.username)
        //        ? req.protocol + '://' + conf.fqdn + '/user/' + ('' + _model.username).toLocaleLowerCase()
        //        : '',
        //      isOp: false,
        //      isOwner: false
        //    };
        //    members.push(user);
        //  });
        //  group.members = members;
        //}

        group.membersCount = 1; // owner
        group.membersCount += (group.op) ? group.op.length : 0;
        group.membersCount += (model.members) ? model.members.length : 0;

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
            var room = {
              id: r.id,
              room_id: r.id,
              avatar: r._avatar(160),
              mode: r.mode,
              color: r.color,
              name: r.name,
              url: (r.name)
                ? req.protocol + '://' + conf.fqdn + '/room/' + r.name.toLocaleLowerCase()
                : '',
              chat: req.protocol + '://' + conf.fqdn + '/!#' + group.name + '/' + r.name,
              join: req.protocol + '://' + conf.fqdn + '/room/join/' + group.name + '/' + r.name
            };

            if (r.owner) {
              room.owner = {
                user_id: r.owner.id,
                username: r.owner.username,
                is_owner: true
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
