var async = require('async');
var _ = require('underscore');
var HistoryRoom = require('../shared/models/historyroom');
var HistoryOne = require('../shared/models/historyone');
var Log = require('../shared/models/log');
var User = require('../shared/models/user');
var Room = require('../shared/models/room');
var fs = require('fs');

// @doc: https://github.com/keen/keen-cli

var BATCH_SIZE = 5000;

module.exports = function(grunt) {

  var shell = './output/keenio.sh';
  var shellContent = '#!/bin/sh\n\n';
  shellContent += 'if [ ! -e .env ]\nthen\n  exit;\nfi\n\n';

  var filename = './output/keenio.*.json';
  var fileCount = 1;
  var push = function (code, bunchString) {
    var file = filename.replace('*', code+'.'+fileCount);
    fileCount ++;
    grunt.file.write(file, bunchString);
    shellContent += 'keen events:add --batch-size '+BATCH_SIZE+' -c '+code+' -f '+file+'\n';
    grunt.log.ok(file+' wrote');
  };

  var process = function(code, stream, compose, end) {
    var bunch = '';
    var bunchCount = 0;
    var totalCount = 0;
    stream.on('data', function (h) {
      var e = compose(h);

      if (bunch != '')
        bunch += '\n'; // not for first line
      bunch += JSON.stringify(e);

      bunchCount ++;
      if (bunchCount >= (BATCH_SIZE-1)) {
        push(code, bunch);
        totalCount += bunchCount;
        bunch = '';
        bunchCount = 0;
      }

    }).on('error', end).on('close', function () {
      totalCount += bunchCount;
      push(code, bunch);
      grunt.log.ok(code+' stream closed, done! ('+totalCount+' written)');
      end();
    });
  };

  grunt.registerTask('import-keen-io', function() {
    var done = this.async();

    grunt.log.ok('start');

    // remove existing files
    _.each(grunt.file.expand(filename), function(f) {
      grunt.file.delete(f);
    });

    var cache = {};
    async.waterfall([

      function rooms(callback) {
        // HISTORYROOM
        var stream = HistoryRoom
            .find({event: 'room:message'})
            .populate('user', 'username admin')
            .sort({time: 'desc'})
            .stream();
        process('room_message', stream, function(h) {
          var e = {
            keen: {
              timestamp: h.time.toISOString()
            },
            user: {
              id: h.user._id.toString(),
              username: h.user.username,
              admin: (h.user.admin === true)
            },
            room: {
              name: h.name
            },
            message: {
              length: (h.data.message) ? h.data.message.length : 0,
              images: (h.data.images && h.data.images.length) ? h.data.images.length : 0
            }
          };
          return e;
        }, callback);
      },

      function ones(callback) {
        // HISTORYONE
        var stream = HistoryOne
            .find({event: 'user:message'})
            .populate('to', 'username admin')
            .populate('from', 'username admin')
            .sort({time: 'desc'})
            .stream();
        process('onetoone_message', stream, function(h) {
          var e = {
            keen: {
              timestamp: h.time.toISOString()
            },
            user: {
              id: h.from._id.toString(),
              username: h.from.username,
              admin: (h.from.admin === true)
            },
            to: {
              id: h.to._id.toString(),
              username: h.to.username,
              admin: (h.to.admin === true)
            },
            message: {
              length: (h.data.message) ? h.data.message.length : 0,
              images: (h.data.images && h.data.images.length) ? h.data.images.length : 0
            }
          };
          return e;
        }, callback);
      },

      function userCache(callback) {
        User.find({username: {$exists: true, $ne: ''}}, 'username admin', function(err, users) {
          if (err)
            return callback(err);

          var count = 0;
          _.each(users, function(u) {
            cache[u.username] = {
              _id: u._id.toString(),
              username: u.username,
              admin: (u.admin === true)
            };
            count ++;
          });

          grunt.log.ok(count+' users cached');
          return callback();
        });
      },

      function sessionStart(callback) {
        var stream = Log
            .find({category: 'donut', "data.route" : "connector.entryHandler.enter"})
            .sort({timestamp: 'desc'})
            .stream();
        process('session_start', stream, function(h) {
          var u = cache[h.data.username] || {};
          var e = {
            keen: {
              timestamp: h.timestamp.toISOString()
            },
            session: {
              connector: h.data.frontendId
            },
            user: {
              id: u._id,
              username: u.username,
              admin: u.admin
            },
            device: {
              type: 'browser'
            }
          };
          return e;
        }, callback);
      },

      function sessionEnd(callback) {
        var stream = Log
            .find({category: 'donut', 'data.event':'onUserLeave'})
            .sort({timestamp: 'desc'})
            .stream();
        process('session_end', stream, function(h) {
          var u = cache[h.data.username] || {};
          var e = {
            keen: {
              timestamp: h.timestamp.toISOString()
            },
            session: {
              connector: h.data.frontendId,
              duration: h.data.session_duration
            },
            user: {
              id: u._id,
              username: u.username,
              admin: u.admin
            },
            device: {
              type: 'browser'
            }
          };
          return e;
        }, callback);
      },

      function roomCreate(callback) {
        var stream = Room
            .find()
            .sort({created_at: 'asc'})
            .populate('owner', 'username admin')
            .stream();
        process('room_creation', stream, function(h) {
          var e = {
            keen: {
              timestamp: h.created_at.toISOString()
            },
            user: {
              id: h.owner._id.toString(),
              username: h.owner.username,
              admin: (h.owner.admin === true)
            },
            room: {
              name: h.name
            }
          };
          return e;
        }, callback);
      }

    ], function(err) {
      if (err)
        grunt.log.error('Error: '+err);

      grunt.file.write(shell, shellContent);
      done();
    });

  });
};