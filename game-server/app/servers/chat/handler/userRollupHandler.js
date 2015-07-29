var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var validator = require('validator');
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handler user read rollup logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.read = function (data, session, next) {

  async.waterfall([

    function retrieveUser(callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user ' + session.uid + ' in user:rollup:read: ' + err);

        if (!user)
          return callback('Unable to retrieve user in user:rollup:read: ' + session.uid);

        return callback(null, user);
      });
    },

    function check(user, callback) {
      if (!data.str || data.str.length == 0)
        return callback('str parameter is missing or empty in user:rollup:read');

      if (_.indexOf(['/', '#', '@'], data.str.substr(0,1)) == -1)
        return callback('wrong pattern called in user:rollup:read');

      return callback(null, user);
    },

    function prepare(user, callback) {
      // @todo yls implement som logic here
      var d;
      switch (data.str.substr(0,1)) {
        case '/': // Look for a list of available commands
          d = {
              type: 'commands',
              results: [
                {name: 'me', description: 'Displays action text'},
                {name: 'kick', description: 'Kick a user'},
                {name: 'ban', description: 'Ban a user'},
                {name: 'deban', description: 'Deban a user'}
                // ...
                ]
            };
          break;
        case '#': // Look for a list of available rooms
          d = {
            type: 'donuts',
            results: [
              {name: 'donut', description: 'some description', users: 450   , avatar:'https://res.cloudinary.com/roomly/image/upload/b_rgb:46bb00,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_100,w_100/room-avatar-default'},
              {name: 'test', description: 'some description', users: 4      , avatar:'https://res.cloudinary.com/roomly/image/upload/b_rgb:46bb00,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_100,w_100/room-avatar-default'},
              {name: 'activity', description: 'some description', users: 150, avatar:'https://res.cloudinary.com/roomly/image/upload/b_rgb:46bb00,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_100,w_100/room-avatar-default'},
              {name: 'dev', description: 'some description', users: 46      , avatar:'https://res.cloudinary.com/roomly/image/upload/b_rgb:46bb00,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_100,w_100/room-avatar-default'}
              // ...
            ]
          };
          break;
        case '@': // Look for a list of available users
          d = {
            type: 'users',
            results: [
              {name: 'yann', status: 'online', bio: 'some bio'      , avatar: 'https://res.cloudinary.com/roomly/image/upload/b_rgb:e70097,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_34,w_34/user-avatar-default'},
              {name: 'damien', status: 'online', bio: 'some bio'    , avatar: 'https://res.cloudinary.com/roomly/image/upload/b_rgb:e70097,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_34,w_34/user-avatar-default'},
              {name: 'david', status: 'online', bio: 'some bio'     , avatar: 'https://res.cloudinary.com/roomly/image/upload/b_rgb:e70097,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_34,w_34/user-avatar-default'},
              {name: 'sebastien', status: 'offline', bio: 'some bio', avatar: 'https://res.cloudinary.com/roomly/image/upload/b_rgb:e70097,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_34,w_34/user-avatar-default'}
              // ...
            ]
          };
          break;
        default:
          break;
      }

      return callback(null, d);
    }

  ], function (err, results) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, results);
  });

};