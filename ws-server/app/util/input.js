'use strict';
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../shared/models/room');
var GroupModel = require('../../../shared/models/group');
var UserModel = require('../../../shared/models/user');
var linkify = require('linkifyjs');
var parser = require('@dbrugne/donut-common/server').markup.parser(linkify);

/**
 * Check for maximal length, sanitize line breaks
 * Return filtered string or empty string if too long or empty.
 * @param value
 * @param maxLength
 * @return false || filtered String
 */
module.exports.filter = function (value, maxLength) {
  // @todo dbr : add without smileys code count

  if (!value) {
    return false;
  }

  // check length
  maxLength = maxLength || 512;
  if (value.length < 1 || value.length > maxLength) {
    return false;
  }

  var filtered = value.replace(/(\r\n|\r)/g, '\n'); // only *nix line-breaks

  // only whitespace
  if (filtered.trim() === '') {
    return false;
  }

  if (filtered === '') {
    return false;
  }

  return filtered;
};

/**
 * Find and replace markupable elements in given string
 * @param string
 * @param callback Function(err, String, {markups})
 */
module.exports.mentions = function (string, callback) {
  if (!string || string === '') {
    return callback(null, string, {});
  }

  parser(string, function (markups, fn) {
    /**
     * parser send object with markups example:
     * { links: [],
     *  users: [],
     *  rooms:
     *  [ { key: '___donut_markup_0___',
     *  match: '#testgroup/donut',
     *  name: 'donut' } ],
     *  groups: [],
     *  emails: [],
     *  all: [ { key: '___donut_markup_0___', value: '#testgroup/donut' } ] }
     */

    if (!markups.rooms.length && !markups.users.length && !markups.groups.length) {
      return fn(null, markups);
    }

    async.parallel([

      function (cb) {
        if (!markups.rooms.length) {
          return cb(null);
        }

        var _rooms = [];
        async.each(markups.rooms, function (r, fn) {
          RoomModel.findByIdentifier(r.match, function (err, model) {
            if (err) {
              return fn(err);
            } else {
              _rooms.push(model);
              return fn(null);
            }
          });
        }, function (err) {
          return cb(err, _rooms);
        });
      },

      function (cb) {
        if (!markups.users.length) {
          return cb(null);
        }

        var _users = _.uniq(_.map(markups.users, function (u) {
          return u.username;
        }));
        UserModel.listByUsername(_users).exec(cb);
      },

      function (cb) {
        if (!markups.groups.length) {
          return cb(null);
        }

        var _groups = _.uniq(_.map(markups.groups, function (r) {
          return r.group_name;
        }));
        GroupModel.listByName(_groups).exec(cb);
      }

    ], function (err, results) {
      if (err) {
        return fn(err);
      }

      _.each(markups.rooms, function (markup, index) {
        var model = _.find(results[ 0 ], function (m) {
          if (typeof m === 'undefined') {
            return false;
          }
          var mMarkup = (m.group && m.group.name)
            ? '#' + m.group.name + '/' + m.name
            : '#' + m.name;
          return (markup.match.toLocaleLowerCase() === mMarkup.toLocaleLowerCase());
        });
        if (!model) {
          return;
        }
        markups.rooms[ index ].id = model.id;
      });
      _.each(markups.users, function (markup, index) {
        var model = _.find(results[ 1 ], function (m) {
          return (markup.username.toLocaleLowerCase() === m.username.toLocaleLowerCase());
        });
        if (!model) {
          return;
        }
        markups.users[ index ].id = model.id;
      });
      // group
      _.each(markups.groups, function (markup, index) {
        var model = _.find(results[ 2 ], function (m) {
          return (markup.group_name.toLocaleLowerCase() === m.name.toLocaleLowerCase());
        });
        if (!model) {
          return;
        }
        markups.groups[ index ].id = model.id;
      });

      return fn(null, markups);
    });
  }, callback);
};
