var async = require('async');
var _ = require('underscore');
var mongoose = require('../shared/io/mongoose');
var Room = require('../shared/models/room');

var userSchema = mongoose.Schema({
  username       : String,
  rooms          : [{ type: String, ref: 'Room' }]
}, {strict: false});
var User = mongoose.model('UserTmp', userSchema, 'users');

module.exports = function(grunt) {

  grunt.registerTask('migrate-user-rooms', function() {
    var done = this.async();
    grunt.log.ok('start');

    var rooms = {};

    async.waterfall([

      function listrooms(callback) {
        Room.find({}, 'name', function(err, results) {
          if (err)
            return callback(err);

          _.each(results, function(room) {
            rooms[room.name] = room.id;
          });
          grunt.log.ok(results.length+' rooms listed:');
          grunt.log.ok(Object.keys(rooms).join(', '));
          return callback(null);
        });
      },

      function listusers(callback) {
        User.find({}, callback);
      },

      function iterateonusers(users, callback) {
        grunt.log.ok(users.length+' users found');
        async.each(users, function(user, fn) {
          if (!user.rooms || !user.rooms.length)
            return fn();

          var userRooms = [];
          _.each(user.rooms, function(ur) {
            userRooms.push(rooms[ur]);
          });

          grunt.log.ok('  + update user @'+user.username+': '+user.rooms.join(', ')+' => '+userRooms.join(', '));
          user.rooms = userRooms;
          user.save(fn);
          //fn();
        }, function(err) {
          grunt.log.ok('users list done!');
          return callback(err);
        });
      }

    ], function(err) {
      if (err)
        grunt.log.error(err+' ');
      else
        grunt.log.ok('success');
      done();
    });
  });

};