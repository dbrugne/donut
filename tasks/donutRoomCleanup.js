var async = require('async');
var _ = require('underscore');
var Room = require('../shared/models/room');
var User = require('../shared/models/user');
var HistoryRoom = require('../shared/models/historyroom');

module.exports = function(grunt) {

    grunt.registerTask('donut-room-cleanup', function() {
        var done = this.async();
        grunt.log.ok('starting cleanup (can take a while)');

        var start = Date.now();
        var count = { found: 0, ignored: 0, removed: 0, history: 0 };

        async.waterfall([

            function list(callback) {
                var q = Room.findOne({name: '#donut'}).populate('users', 'username lastlogin_at');
                q.exec(function(err, room) {
                    if (err)
                      return callback(err);

                    count.found = room.users.length;

                    var timeAgo = new Date();
                    timeAgo.setMonth(timeAgo.getMonth() - 2); // 2 month ago
                    var usersToRemove = [];
                    _.each(room.users, function(u) {
                        if (u.lastlogin_at >= timeAgo) {
                           grunt.log.ok('User '+u.username+' should be ignored '+ u.lastlogin_at);
                           count.ignored ++;
                           return;
                        }

                        grunt.log.ok('User '+u.username+' should be removed '+ u.lastlogin_at);
                        usersToRemove.push(u._id);
                        count.removed ++;
                    });

                    return callback(null, usersToRemove);
                });
            },

            function updateRoom(usersToRemove, callback) {
                Room.update({name: '#donut'}, { $pull: { users: { $in: usersToRemove } } }, { multi: true }, function(err, result) {
                    if (err)
                        return callback(err);

                    grunt.log.ok('Update room result:', result);
                    return callback(null, usersToRemove);
                });
            },

            function updateUsers(usersToRemove, callback) {
                User.update({ _id: { $in: usersToRemove } }, { $pull: { rooms: '#donut' } }, { multi: true }, function(err, result) {
                    if (err)
                        return callback(err);

                    grunt.log.ok('Update users result:', result);
                    return callback(null, usersToRemove);
                });
            },

            function cleanupHistory(usersToRemove, callback) {
                HistoryRoom.update(
                  { name: '#donut', users: { $in: usersToRemove } }, // get all history for removed users
                  { $pull: { users: { $in: usersToRemove } } }, // remove them from history
                  { multi: true },
                  function(err, result) {
                      if (err)
                          return callback(err);

                      grunt.log.ok('Update history result:', result);
                      count.history = result;
                      return callback();
                  }
                );
            }

        ], function(err) {
            if (err) {
                grunt.log.error(err+' ');
                done();
            } else {
                var duration = Date.now() - start;
                grunt.log.ok('Successfully done ('+count.found+' found, '+count.ignored+' ignored, '+count.removed+' removed, history '+count.history+') in '+duration+'ms');
                done();
            }
        });

    });

}
