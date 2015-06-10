var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');
var Room = require('../shared/models/room');
var HistoryRoom = require('../shared/models/historyroom');

module.exports = function(grunt) {

  grunt.registerTask('create-ancient-room', function() {
    var done = this.async();
    grunt.log.ok('start');

    var rooms = {};
    var ancientRooms = [];
    async.waterfall([

      function listRooms(callback) {
        Room.find({}, function(err, results) {
          if (err)
            return callback(err);

          grunt.log.ok(results.length+' rooms listed');
          _.each(results, function(room) {
             rooms[room.name] = room.id;
          });
          return callback(null);
        });
      },

      function iterate(callback) {
        var stream = HistoryRoom.find({room: {$exists: false}, name: {$exists: true}}).limit(1000000).stream();
        stream.on('data', function (history) {
          var roomName = history._doc.name;
          if (!roomName)
            return;

          var roomId = rooms[roomName];
          if (!roomId) {
            if (ancientRooms.indexOf(roomName) === -1)  {
              ancientRooms.push(roomName);
              grunt.log.ok("  + ancient room found: "+roomName);
            }
          }

        }).on('error', function (err) {
            callback(err);
        }).on('close', function () {
            callback(null);
        });
      },

      function createRooms(callback) {
        _.each(ancientRooms, function(name) {
          grunt.log.ok("  + create room: "+name);
          var model = new Room();
          model.name = name;
          model.deleted = true;
          model.save(function(err) {
            if (err)
              console.log(err);
          });
        });

        callback();
      }

    ], function(err) {
      if (err)
        grunt.log.error(err + ' ');
      else {
        if (ancientRooms.length)
          grunt.log.ok('ancient rooms found and created: '+ancientRooms.join(', '));
      }
      done();
    });
  });

};