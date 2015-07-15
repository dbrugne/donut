var async = require('async');
var _ = require('underscore');
var UserModel = require('../shared/models/user');
var NotificationModel = require('../shared/models/notification');
var HistoryOneModel = require('../shared/models/historyone');
var HistoryRoomModel = require('../shared/models/historyroom');
var PomeloBridge = require('../game-server/app/components/bridge').Bridge;

module.exports = function (grunt) {

  grunt.loadNpmTasks("grunt-extend-config");
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      usernameFrom: {
        options: {
          questions: [{
            config: 'usernameFrom',
            type: 'input',
            message: 'Choose a "from"/"by" username (the one who made the action, sends the message...)',
            default: 'david'
          }]
        }
      },
      usernameTo: {
        options: {
          questions: [{
            config: 'usernameTo',
            type: 'input',
            message: 'Choose a "to" username (the one who is the subject of the action, receives the message...)',
            default: 'yangs'
          }]
        }
      }
    }
  });

  grunt.registerTask('donut-create-test-notifications', function () {

    var usernameFrom = grunt.config('usernameFrom') || 'david';
    var usernameTo = grunt.config('usernameTo') || 'yangs';

    var userFrom = null;
    var userTo = null;

    var configuration = grunt.config('pomelo');
    var bridge = PomeloBridge({
      masterId  : configuration.master.id,
      host      : configuration.master.host,
      port      : configuration.master.port,
      username  : configuration.adminUser[0].username,
      password  : configuration.adminUser[0].password
    });

    var done = this.async();
    async.waterfall([

      function retrieveUsers(callback) {
        UserModel.findByUsername(usernameFrom).exec(function (err, u) {
          if (err)
            return callback('Error while retrieving user from '+usernameFrom+': '+err);
          if (!u)
            return callback('Unable to retrieve user: '+usernameFrom);
          userFrom = u;

          UserModel.findByUsername(usernameTo).exec(function (err, u) {
            if (err)
              return callback('Error while retrieving user from '+usernameTo+': '+err);
            if (!u)
              return callback('Unable to retrieve user: '+usernameTo);

            userTo = u;
            return callback(null);
          });
        });
      },

      //// usermessage notification type
      //function usermessage(callback) {
      //  var data = {
      //    from            : userFrom.id,
      //    from_user_id    : userFrom.id,
      //    from_username   : userFrom.username,
      //    from_avatar     : userFrom._avatar(),
      //    to              : userTo.id,
      //    to_user_id      : userTo.id,
      //    to_username     : userTo.username,
      //    time            : new Date(),
      //    message         : 'salut, ça va ? Il est '+time
      //  };
      //  HistoryOneModel.record()('user:message', data, callback);
      //},

      function usermessageType(callback) {
        var event = {
          from            : userFrom.id,
          from_user_id    : userFrom.id,
          from_username   : userFrom.username,
          from_avatar     : userFrom._avatar(),
          to              : userTo.id,
          to_user_id      : userTo.id,
          to_username     : userTo.username,
          time            : new Date(),
          message         : 'message aléatoire : '+Date.now()
        };
        HistoryOneModel.record()('user:message', event, function(err, sentEvent) {
          if (err)
            return callback(err);

          var data = {
            type: 'usermessage',
            to: userTo.id,
            event: sentEvent.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err)
              return callback(err);

            grunt.log.ok('usermessageType done');
            return callback(null);
          });
        });
      },

      function roomopType(callback) {
        var event = {
          name: '#donut',
          id: userTo.id,
          user_id: userTo.id,
          username: userTo.username,
          avatar: userTo._avatar(),
          by_user_id: userFrom.id,
          by_username: userFrom.username,
          by_avatar: userFrom._avatar(),
          time            : new Date()
        };
        HistoryOneModel.record()('room:op', event, function(err, sentEvent) {
          if (err)
            return callback(err);

          var data = {
            type: 'roomop',
            to: userTo.id,
            event: sentEvent.id
          };
          bridge.notify('chat', 'createNotificationTask.createNotification', data, function (err) {
            if (err)
              return callback(err);

            grunt.log.ok('roomopType done');
            return callback(null);
          });
        });
      }

      /*
       // roomop notification type
       room:op { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       by_user_id: '54c8aabb63d4989965595ecc',
       by_username: 'yangs',
       by_avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       user_id: '54eb249af72d96f404ec926b',
       username: '^Frontiere^',
       avatar: 'cloudinary=v1427400681/mvaacd3gv3htbmmttauu.jpg#!#color=#FC2063',
       time: 1436431846391 }

       // roomdeop notification type
       room:deop { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       by_user_id: '54c8aabb63d4989965595ecc',
       by_username: 'yangs',
       by_avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       user_id: '54eb249af72d96f404ec926b',
       username: '^Frontiere^',
       avatar: 'cloudinary=v1427400681/mvaacd3gv3htbmmttauu.jpg#!#color=#FC2063',
       time: 1436431840669 }

       // roomkick notification type
       room:kick { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       by_user_id: '54c8aabb63d4989965595ecc',
       by_username: 'yangs',
       by_avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       user_id: '54fda8f4dc887888084c2c2f',
       username: '123456',
       avatar: 'color=#f0a930',
       time: 1436431850012 }

       // roomban notification type
       room:ban { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       by_user_id: '54c8aabb63d4989965595ecc',
       by_username: 'yangs',
       by_avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       user_id: '54da6786f72d96f404ec920b',
       username: 'AbdelL',
       avatar: 'color=#00aaa0',
       time: 1436431854736 }

       // roomdeban notification type

       // roomtopic notification type
       room:topic { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       user_id: '54c8aabb63d4989965595ecc',
       username: 'yangs',
       avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       topic: 'DONUT: la machine à communiquer dans le temps !d',
       time: 1436431925735 }

       // roommessage notification type
       room:message { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       time: 1436431943110,
       user_id: '54c8aabb63d4989965595ecc',
       username: 'yangs',
       avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       message: 'fsdf' }

       // roomjoin notification type
       room:in { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       user_id: '54c8aabb63d4989965595ecc',
       username: 'yangs',
       avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       time: 1436431956441 }

       // usermention notification type
       room:message { name: '#donut',
       id: '557817da9dc52bb49e73f342',
       time: 1436431967737,
       user_id: '54c8aabb63d4989965595ecc',
       username: 'yangs',
       avatar: 'cloudinary=v1422437207/sz0yn9kyfop1jpkaqs2o.jpg#!#color=#CC1F2F',
       message: '@[David](user:54285377bb6c3d101ec179cb)' }
       */

      // @todo userban
      // @todo userdeban
      // @todo send browser notification

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

  grunt.registerTask('donut-test-notifications', 'Create a set of test notifications in database',[
    'load-pomelo-configuration',
    'prompt:usernameFrom',
    'prompt:usernameTo',
    'donut-create-test-notifications'
  ]);
};