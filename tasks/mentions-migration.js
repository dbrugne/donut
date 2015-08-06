var async = require('async');
var _ = require('underscore');
//var RoomModel = require('../shared/models/room');
//var UserModel = require('../shared/models/user');
var HistoryRoomModel = require('../shared/models/historyroom');
var common = require('donut-common');

module.exports = function(grunt) {

  grunt.registerTask('mentions-migration', 'Replace old mention markup with new one', function() {
    var done = this.async();
    grunt.log.ok('starting');

    var start = Date.now();
    var count = { found: 0, updated: 0 };

    //var rooms = {};
    //var users = {};

    async.waterfall([

      //function listRoomsAndUsers(callback) {
      //  RoomModel.find({}, 'name', function(err, roomModels) {
      //    UserModel.find({}, 'username', function(err, userModels) {
      //      if (err)
      //        return callback(err);
      //
      //      _.each(roomModels, function(m) {
      //        rooms[m.name] = m;
      //      });
      //      _.each(userModels, function(m) {
      //        users[m.username] = m;
      //      });
      //
      //      grunt.log.ok(roomModels.length + ' rooms and ' + userModels.length + ' users listed');
      //      return callback(null);
      //    });
      //  });
      //},

      function replaceOldUserMentions(callback) {
        var stream = HistoryRoomModel.find({
          event: 'room:message',
          'data.message': { $exists: true, $ne: '' }
        }, 'data').stream();

        var oldMarkupRegExp = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
        var newMarkupReplacement = '[@:$2:$1]';
        var updates = [];
        stream.on('data', function (event) {
          var oldMessage = event.data.message;
          if (!oldMarkupRegExp.test(oldMessage))
            return;

          var newMessage = oldMessage.replace(oldMarkupRegExp, newMarkupReplacement);
          grunt.log.ok('Update ' + event.id + ': ' + oldMessage + ' ==> ' + newMessage);

          updates.push({ _id: event._id, message: newMessage });
          count.found ++;

        }).on('error', callback).on('close', function() {
          return callback(null, updates);
        });
      },

      function update(updates, callback) {
        async.eachLimit(updates, 20, function(element, fn) {
          HistoryRoomModel.update({_id: element._id}, { $set: { 'data.message': element.message } }, fn);
          count.updated ++;
        }, callback);
      }

    ], function(err) {
      if (err) {
        grunt.log.error(err+' ');
        done();
      } else {
        var duration = Date.now() - start;
        grunt.log.ok('Successfully done ('+count.found+' found and ' + count.updated + ' updated in '+duration+'ms)');
        done();
      }
    });

  });

}
