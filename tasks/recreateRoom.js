var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');
var Room = require('../shared/models/room');

module.exports = function(grunt) {

  grunt.registerTask('recreate-rooms', function() {
    var done = this.async();
    grunt.log.ok('start');

    async.waterfall([

      function addFlag(callback) {
        Room.update({}, {$set: {to_delete: true}}, {multi: true}, function(err, num) {
          grunt.log.ok(num+' rooms flagged');
          return callback(err);
        });
      },

      function listRooms(callback) {
        Room.find({}, function(err, rooms) {
          grunt.log.ok(rooms.length+' rooms listed');
          return callback(err, rooms);
        });
      },

      function cloneRooms(rooms, callback) {
        async.each(rooms, function(room, fn) {
          var newRoom = new Room();
          var data = room.toJSON();
          delete data._id, data.id;
          data.to_delete = false;
          newRoom.set(data);
          newRoom.save(function(err) {
            if (err)
              return fn(err);

            grunt.log.ok('+ '+room.name+' cloned ('+newRoom._id+', '+newRoom.to_delete+')');
            return fn();
          });
        }, function(err) {
          grunt.log.ok('clone done!');
          return callback(err);
        });
      },

      function deleteRooms(callback) {
        Room.remove({ to_delete: true }, function(err, num) {
          grunt.log.ok(num+' rooms removed');
          return callback(err);
        });
      },

      function removeFlag(callback) {
        Room.update({}, {$unset: {to_delete: 1}}, {multi: true}, function(err, num) {
          grunt.log.ok(num+' rooms unflagged');
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