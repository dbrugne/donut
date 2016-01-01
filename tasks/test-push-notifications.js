module.exports = function (grunt) {
  var parse = require('../shared/io/parse');
  var _ = require('underscore');
  var types = _.map(parse, function (value, key) {
    return {name: key};
  });
  grunt.loadNpmTasks('grunt-extend-config');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      notifUsernameTo: {
        options: {
          questions: [ {
            config: 'notifUsernameTo',
            type: 'input',
            message: 'Choose a "to" username (the one who receives the message...)',
            default: 'david'
          } ]
        }
      },
      whichOne: {
        options: {
          questions: [ {
            config: 'whichOne',
            type: 'list',
            choices: types,
            message: 'Which push notification?',
            default: 'userMessage',
            when: function () {
              return !(grunt.option('whichOne'));
            }
          } ]
        }
      }
    }
  });

  grunt.registerTask('donut-create-test-push-notifications', function () {
    var async = require('async');
    var UserModel = require('../shared/models/user');
    var RoomModel = require('../shared/models/room');
    var GroupModel = require('../shared/models/group');

    var notificationType = grunt.config('whichOne');
    var usernameTo = grunt.config('notifUsernameTo') || 'david';

    var groupName = 'donut';
    var usernameFrom = 'yangs';
    var roomIdentifier = '#donut/donut';
    var message = 'grunt Test push notification';
    var topic = 'grunt topic @yangs';
    var userFrom = null;
    var userTo = null;
    var room = null;
    var group = null;

    var done = this.async();
    async.waterfall([

      function retrieveUsers (callback) {
        UserModel.findByUsername(usernameFrom).exec(function (err, u) {
          if (err) {
            return callback('Error while retrieving user from ' + usernameFrom + ': ' + err);
          }
          if (!u) {
            return callback('Unable to retrieve user: ' + usernameFrom);
          }
          userFrom = u;

          UserModel.findByUsername(usernameTo).exec(function (err, u) {
            if (err) {
              return callback('Error while retrieving user from ' + usernameTo + ': ' + err);
            }
            if (!u) {
              return callback('Unable to retrieve user: ' + usernameTo);
            }

            userTo = u;
            return callback(null);
          });
        });
      },
      function retrieveRoom (callback) {
        RoomModel.findByIdentifier(roomIdentifier, function (err, r) {
          if (err) {
            return callback('Error while retrieving room ' + roomIdentifier + ': ' + err);
          }
          if (!r) {
            return callback('Unable to retrieve room: ' + roomIdentifier);
          }
          room = r;
          return callback(null);
        });
      },

      function retrieveGroup (callback) {
        GroupModel.findByName(groupName).exec(function (err, g) {
          if (err) {
            return callback('Error while retrieving group ' + groupName + ': ' + err);
          }
          if (!g) {
            return callback('Unable to retrieve group: ' + groupName);
          }
          group = g;
          return callback(null);
        });
      },
      function send (callback) {
        // Avatar are possibly not the good one
        var args = {
          userMessage: [userTo.id, userFrom.username, message, userFrom._avatar(), callback],
          userMention: [userTo.id, userFrom.username, roomIdentifier, message, userFrom._avatar(), callback],
          roomTopic: [userTo.id, roomIdentifier, topic, userFrom._avatar(), callback],
          roomMessage: [userTo.id, roomIdentifier, message, room._avatar(), callback],
          roomJoin: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomJoinRequest: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomRefuse: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomInvite: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomDelete: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomCreate: [userTo.id, userFrom.username, roomIdentifier, room._avatar(), callback],
          roomOp: [userTo.id, roomIdentifier, room._avatar(), callback],
          roomDeop: [userTo.id, roomIdentifier, room._avatar(), callback],
          roomKick: [userTo.id, roomIdentifier, room._avatar(), callback],
          roomBan: [userTo.id, roomIdentifier, room._avatar(), callback],
          roomVoice: [userTo.id, roomIdentifier, room._avatar(), callback],
          roomDevoice: [userTo.id, roomIdentifier, room._avatar(), callback],
          groupJoinRequest: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupAllowed: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupInvite: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupDisallow: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupBan: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupDeban: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupOp: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback],
          groupDeop: [userTo.id, userFrom.username, group.getIdentifier(), group._avatar(), callback]
        };

        parse[notificationType].apply(parse, args[notificationType]);
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err);
        done();
      } else {
        grunt.log.ok('Successfully done');
        done();
      }
    });
  });

  grunt.registerTask('donut-test-push-notifications', 'Create a set of test notifications in database', [
    'prompt:notifUsernameTo',
    'prompt:whichOne',
    'donut-create-test-push-notifications'
  ]);
};
