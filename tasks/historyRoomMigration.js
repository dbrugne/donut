var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');
var Room = require('../shared/models/room');
var HistoryRoom = require('../shared/models/historyroom');

module.exports = function(grunt) {

  grunt.registerTask('historyroom-migration', function() {
    var done = this.async();
    grunt.log.ok('start');

    var rooms = {};
    var totalCount = 0;
    var stepCount = 0;
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
        var stream = HistoryRoom.find({room: {$exists: false}, name: {$exists: true}}).limit(50000).stream();
        stream.on('data', function (history) {
          var roomName = history._doc.name;
          if (!roomName)
            return grunt.log.warn("  ! entry "+history.id+" hasn't 'name' field");

          var roomId = rooms[roomName];
          if (!roomId) {
            return grunt.log.warn("  ! entry "+history.id+"/"+history.event+" hasn't valid 'name' field: "+roomName+' (Room probably no longer exists)');
          }

          totalCount ++;
          HistoryRoom.update({ _id: history._id }, {
              $set: {room: roomId},
              $unset: { name: 1 }
          }, function(err) {
              if (err)
                return callback(err);
              stepCount ++;
              if (stepCount >= 10000) {
                grunt.log.ok('  + updated '+stepCount+' events');
                stepCount = 0;
              }
          });

        }).on('error', function (err) {
            callback(err);
        }).on('close', function () {
            callback(null);
        });
      }

    ], function(err) {
      if (err)
        grunt.log.error(err + ' ');
      else {
        grunt.log.ok('  = success, updated '+totalCount+' events (process could still running)');
      }
      done();
    });
  });

};