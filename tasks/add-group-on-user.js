module.exports = function (grunt) {
  grunt.registerTask('donut-create-add-group-on-user', function () {
    var async = require('async');
    var UserModel = require('../shared/models/user');
    var RoomModel = require('../shared/models/room');

    var done = this.async();
    async.waterfall([

      function retrieveUsers (callback) {
        UserModel.find({}).exec(function (err, users) {
          if (err) {
            return callback('Error while retrieving users: ' + err);
          }
          if (!users) {
            return callback('Unable to retrieve users');
          }

          return callback(null, users);
        });
      },

      function retrieveAndPersistGroup (users, callback) {
        async.eachLimit(users, 15, function (user, cb) {
          RoomModel.findByUser(user.id)
            .exec(function (err, rooms) {
              if (err) {
                return cb(err);
              }
              async.eachLimit(rooms, 15, function (room, fn) {
                if (room.group) {
                  user.groups.addToSet(room.group);
                }
                return fn(null);
              }, function (err) {
                if (err) {
                  return cb(err);
                }
                user.save(function (err) {
                  return cb(err);
                });
              });
            });
        }, function (err) {
          return callback(err);
        });
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

  grunt.registerTask('donut-add-group-on-user', 'Add opened group on user model', [
    'donut-create-add-group-on-user'
  ]);
};

