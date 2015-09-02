var async = require('async');
var RoomModel = require('../shared/models/room');
var UserModel = require('../shared/models/user');

module.exports = function (grunt) {

  grunt.registerTask('preferences-owner-migration', 'Set the user preferences on owner', function () {

    var done = this.async();
    grunt.log.ok('starting');

    var start = Date.now();
    var count = {
      room: {found: 0},
      owner: {found: 0, updated: 0}
    };

    var roomIterator = function (model, fn) {
      count.room.found ++;
      UserModel.findOne({_id: model.owner}, 'preferences', function (err, userModel) {
        if (err) {
          return fn(err);
        }
        count.owner.found ++;
        userModel.set('preferences.room:notif:roommessage:' + model.name, true);
        userModel.set('preferences.room:notif:roomtopic:' + model.name, true);
        userModel.set('preferences.room:notif:roomjoin:' + model.name, true);
        userModel.save(function (err) {
          if (err) {
            return fn(err);
          }
          count.owner.updated ++;
        });
        fn(null);
      });
    };

    async.series([

      /**
       * Next, retrieve and run iterator on every room
       */
      function room (callback) {
        RoomModel.find({deleted: false}, 'name owner', function (err, models) {
          if (err) {
            return callback(err);
          }
          async.each(models, roomIterator, callback);
        });
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err + ' ');
        return done();
      }

      var duration = Date.now() - start;
      grunt.log.ok('Successfully done (' + count.room.found + ' rooms found');
      grunt.log.ok(count.owner.found + ' users found and ' + count.owner.updated + ' updated, in ' + duration + 'ms)');
      done();
    });

  });
}