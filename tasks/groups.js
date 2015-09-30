var async = require('async');
var UserModel = require('../shared/models/user');
var RoomModel = require('../shared/models/room');
var GroupModel = require('../shared/models/group');

module.exports = function (grunt) {
  grunt.registerTask('donut-groups', function () {
    var done = this.async();

    var owner;
    async.series([
      function findOwner (callback) {
        UserModel.findOne({username: 'damien'}, function (err, doc) {
          if (err) {
            return callback(err);
          }

          owner = doc;
          return callback(null);
        });
      },
      function cleanup (callback) {
        RoomModel.update({}, {$unset: {group: true}}, {multi: true}, function (err) {
          if (err) {
            return callback(err);
          }
          GroupModel.remove({}, function (err) {
            return callback(err);
          });
        });
      },
      function donut (callback) {
        var group = new GroupModel();
        group.owner = owner._id;
        group.name = 'donut';
        group.save(function (err) {
          if (err) {
            return callback(err);
          }
          RoomModel.update({name: {$in: ['#donut', '#help', '#avenirDonut']}}, {$set: {group: group._id}}, {multi: true}, function (err) {
            return callback(err);
          });
        });
      },
      function paintball (callback) {
        var group = new GroupModel();
        group.owner = owner._id;
        group.name = 'paintball';
        group.save(function (err) {
          if (err) {
            return callback(err);
          }
          RoomModel.update({name: {$in: ['#Shop-Paintball', '#paintball', '#DagnirDae']}}, {$set: {group: group._id}}, {multi: true}, function (err) {
            return callback(err);
          });
        });
      }
    ], function (err) {
      if (err) {
        grunt.log.error(err);
      }
      done();
    });
  });
};
