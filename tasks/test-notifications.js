var async = require('async');
var UserModel = require('../shared/models/user');
var RoomModel = require('../shared/models/room');
var GroupModel = require('../shared/models/group');
var HistoryOneModel = require('../shared/models/historyone');
var HistoryRoomModel = require('../shared/models/historyroom');
var PomeloBridge = require('../ws-server/app/components/bridge').Bridge;

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-extend-config');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      notifUsernameFrom: {
        options: {
          questions: [ {
            config: 'notifUsernameFrom',
            type: 'input',
            message: 'Choose a "from"/"by" username (the one who made the action, sends the message...)',
            default: 'yangs'
          } ]
        }
      },
      notifUsernameTo: {
        options: {
          questions: [ {
            config: 'notifUsernameTo',
            type: 'input',
            message: 'Choose a "to" username (the one who is the subject of the action, receives the message...)',
            default: 'david'
          } ]
        }
      },
      notifIdentifier: {
        options: {
          questions: [ {
            config: 'notifIdentifier',
            type: 'input',
            message: 'Choose a "room" name',
            default: '#donut/donut'
          } ]
        }
      },
      notifGroupIdentifier: {
        options: {
          questions: [ {
            config: 'notifGroupIdentifier',
            type: 'input',
            message: 'Choose a "group" name',
            default: '#donut'
          } ]
        }
      },
      notifMessage: {
        options: {
          questions: [ {
            config: 'notifMessage',
            type: 'input',
            message: 'Type a message',
            default: 'Salut, ça va [@¦53e69205962c67de3e4e9550¦damien] et [@¦53e69205962c67de3e4e9550¦damien] ...'
          } ]
        }
      }
    }
  });

  grunt.registerTask('donut-create-test-notifications', function () {
    var usernameFrom = grunt.config('notifUsernameFrom') || 'yangs';
    var usernameTo = grunt.config('notifUsernameTo') || 'david';
    var identifier = grunt.config('notifIdentifier') || '#donut/donut';
    var groupidentifier = grunt.config('notifGroupIdentifier') || '#donut';
    var message = grunt.config('notifMessage') || '';

    var userFrom = null;
    var userTo = null;
    var room = null;
    var group = null;

    var configuration = grunt.config('pomelo');
    var bridge = PomeloBridge({
      masterId: configuration.master.id,
      host: configuration.master.host,
      port: configuration.master.port,
      username: configuration.adminUser[ 0 ].username,
      password: configuration.adminUser[ 0 ].password
    });

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
        RoomModel.findByIdentifier(identifier, function (err, r) {
          if (err) {
            return callback('Error while retrieving room ' + identifier + ': ' + err);
          }
          if (!r) {
            return callback('Unable to retrieve room: ' + identifier);
          }
          room = r;
          return callback(null);
        });
      },

      function retrieveGroup (callback) {
        GroupModel.findByName(groupidentifier.replace('#', '')).exec(function (err, g) {
          if (err) {
            return callback('Error while retrieving group ' + identifier + ': ' + err);
          }
          if (!g) {
            return callback('Unable to retrieve group: ' + identifier);
          }
          group = g;
          return callback(null);
        });
      },

      function usermessageType (callback) {
        var event = {
          user_id: userFrom.id,
          username: userFrom.username,
          realname: userFrom.realname,
          avatar: userFrom._avatar(),
          to_user_id: userTo.id,
          time: new Date(),
          message: message
        };
        HistoryOneModel.record()('user:message', event, function (err, history) {
          if (err) {
            return callback(err);
          }

          var data = {
            type: 'usermessage',
            user: userTo.id,
            history: history.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return callback(err);
            }

            grunt.log.ok('usermessageType done');
            return callback(null);
          });
        });
      },

      function roomTopicType (callback) {
        var event = {
          name: room.name,
          id: room.id,
          user_id: userFrom.id,
          username: userFrom.username,
          avatar: userFrom._avatar(),
          topic: message,
          time: new Date()
        };
        HistoryRoomModel.record()(room, 'room:topic', event, function (err, history) {
          if (err) {
            return callback(err);
          }

          var data = {
            type: 'roomtopic',
            room: room.id,
            history: history.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return callback(err);
            }

            grunt.log.ok('roomtopicType done');
            return callback(null);
          });
        });
      },

      function roomPromoteTypes (callback) {
        async.each([
          { event: 'room:op', notification: 'roomop' },
          { event: 'room:deop', notification: 'roomdeop' },
          { event: 'room:ban', notification: 'roomban' },
          { event: 'room:deban', notification: 'roomdeban' },
          { event: 'room:voice', notification: 'roomvoice' },
          { event: 'room:devoice', notification: 'roomdevoice' },
          { event: 'room:kick', notification: 'roomkick' }
        ], function (item, fn) {
          var event = {
            name: room.name,
            id: room.id,
            user_id: userTo.id,
            username: userTo.username,
            avatar: userTo._avatar(),
            by_user_id: userFrom.id,
            by_username: userFrom.username,
            by_avatar: userFrom._avatar(),
            time: new Date()
          };
          HistoryRoomModel.record()(room, item.event, event, function (err, history) {
            if (err) {
              return fn(err);
            }

            var data = {
              type: item.notification,
              user: userTo.id,
              room: room.id,
              history: history.id
            };
            bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
              if (err) {
                return fn(err);
              }

              grunt.log.ok(item.notification + 'Type done');
              return fn(null);
            });
          });
        }, callback);
      },

      function roomRequestTypes (callback) {
        async.each([
          { notification: 'roomallowed' },
          { notification: 'roomrefuse' },
          { notification: 'roomjoinrequest' },
          { notification: 'roominvite' },
          { notification: 'roomdelete' },
          { notification: 'roomcreate' }
        ], function (item, fn) {
          var event = {
            name: room.name,
            id: room.id,
            user_id: userTo.id,
            username: userTo.username,
            avatar: userTo._avatar(),
            by_user_id: userFrom.id,
            by_username: userFrom.username,
            by_avatar: userFrom._avatar(),
            time: new Date()
          };
          var data = {
            type: item.notification,
            user: userTo.id,
            room: room.id,
            history: event
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return fn(err);
            }

            grunt.log.ok(item.notification + 'Type done');
            return fn(null);
          });
        }, callback);
      },

      function roomMessageType (callback) {
        var event = {
          name: room.name,
          id: room.id,
          user_id: userFrom.id,
          username: userFrom.username,
          avatar: userFrom._avatar(),
          to: userTo.id,
          message: message,
          time: new Date()
        };
        HistoryRoomModel.record()(room, 'room:message', event, function (err, history) {
          if (err) {
            return callback(err);
          }

          var data = {
            type: 'roommessage',
            room: room.id,
            history: history.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return callback(err);
            }

            grunt.log.ok('roomMessageType done');
            return callback(null);
          });
        });
      },

      function roomJoinType (callback) {
        var event = {
          name: room.name,
          id: room.id,
          user_id: userFrom.id,
          username: userFrom.username,
          avatar: userFrom._avatar(),
          time: new Date()
        };
        HistoryRoomModel.record()(room, 'room:in', event, function (err, history) {
          if (err) {
            return callback(err);
          }

          var data = {
            type: 'roomjoin',
            room: room.id,
            history: history.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return callback(err);
            }

            grunt.log.ok('roomJoinType done');
            return callback(null);
          });
        });
      },

      function userMentionType (callback) {
        var event = {
          name: room.name,
          id: room.id,
          user_id: userFrom.id,
          username: userFrom.username,
          avatar: userFrom._avatar(),
          message: message + ' [@¦' + userTo.id + '¦' + userTo.username + '] suite du message',
          time: new Date()
        };
        HistoryRoomModel.record()(room, 'room:message', event, function (err, history) {
          if (err) {
            return callback(err);
          }

          var data = {
            type: 'usermention',
            user: userTo.id,
            room: room.id,
            history: history.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return callback(err);
            }

            grunt.log.ok('userMentionType done');
            return callback(null);
          });
        });
      },

      function groupRequestTypes (callback) {
        async.each([
          { notification: 'groupallowed' },
          { notification: 'groupdisallow' },
          { notification: 'grouprefuse' },
          { notification: 'groupjoinrequest' },
          { notification: 'groupinvite' },
          { notification: 'groupop' },
          { notification: 'groupdeop' },
          { notification: 'groupban' },
          { notification: 'groupdeban' }
        ], function (item, fn) {
          var event = {
            id: group.id,
            by_user_id: userFrom._id,
            by_username: userFrom.username,
            by_avatar: userFrom._avatar(),
            user_id: userTo._id,
            username: userTo.username,
            avatar: userTo._avatar(),
            group_id: group.id,
            group_name: group.name,
            time: new Date(),
            banned_at: new Date()
          };
          var data = {
            type: item.notification,
            user: userTo.id,
            room: group._id,
            history: event
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err) {
              return fn(err);
            }

            grunt.log.ok(item.notification + 'Type done');
            return fn(null);
          });
        }, callback);
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

  grunt.registerTask('donut-test-notifications', 'Create a set of test notifications in database', [
    'load-pomelo-configuration',
    'prompt:notifUsernameFrom',
    'prompt:notifUsernameTo',
    'prompt:notifIdentifier',
    'prompt:notifGroupIdentifier',
    'prompt:notifMessage',
    'donut-create-test-notifications'
  ]);
};
