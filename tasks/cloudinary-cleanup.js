var async = require('async');
var _ = require('underscore');
var RoomModel = require('../shared/models/room');
var UserModel = require('../shared/models/user');
var HistoryRoomModel = require('../shared/models/historyroom');
var HistoryOneModel = require('../shared/models/historyone');
var cloudinary = require('../shared/util/cloudinary').cloudinary;

module.exports = function (grunt) {
  grunt.registerTask('cloudinary-cleanup', 'List images cloudinary', function () {
    var done = this.async();
    grunt.log.ok('starting');
    grunt.log.ok('...');

    var start = Date.now();
    var imagesIdDatabase = [];
    var imagesIdCloudinary = [];
    var config = { type: 'upload', max_results: 500 };
    var regexpId = new RegExp('^v[0-9]+/([a-z0-9]+)\.[a-z]+');
    var count = {
      room: { found: 0, posterfound: 0, avatarfound: 0 },
      user: { found: 0, posterfound: 0, avatarfound: 0 },
      historyroom: { found: 0, imagefound: 0 },
      historyone: { found: 0, imagefound: 0 },
      delta: 0
    };

    /** ***************************************************************************************************************
     *
     * Iterator
     *
     *****************************************************************************************************************/
    var avatarPosterIterator = function (model, fn) {
      var type = (model.name)
        ? 'room'
        : 'user';

      count[ type ].found++;

      if (!model.avatar && !model.poster) {
        return fn(null);
      }

      if (model.avatar) {
        var avatarId = model.avatar.match(regexpId);
        if (avatarId) {
          imagesIdDatabase.push(avatarId[ 1 ]);
        }
        count[ type ].avatarfound++;
      }
      if (model.poster) {
        var posterId = model.poster.match(regexpId);
        if (posterId) {
          imagesIdDatabase.push(posterId[ 1 ]);
        }
        count[ type ].posterfound++;
      }

      fn(null);
    };

    var imagesIterator = function (model, fn) {
      var type = (model.room)
        ? 'historyroom'
        : 'historyone';

      count[ type ].found++;

      if (!model.data.files) {
        return fn(null);
      }

      _.each(model.data.files, function (img) {
        if (img.public_id) {
          imagesIdDatabase.push(img.public_id);
        }
      });
      count[ type ].imagefound += model.data.files.length;
      fn(null);
    };

    async.series([

      function roomsAvatarPoster (callback) {
        RoomModel.find({ $or: [ { poster: { $exists: true } }, { avatar: { $exists: true } } ] }, 'name avatar poster', function (err, models) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(models, avatarPosterIterator, callback);
        });
      },
      function usersAvatarPoster (callback) {
        UserModel.find({ $or: [ { poster: { $exists: true } }, { avatar: { $exists: true } } ] }, 'username avatar poster', function (err, models) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(models, avatarPosterIterator, callback);
        });
      },
      function historyroomImages (callback) {
        HistoryRoomModel.find({ 'data.files': { $exists: true } }, 'room data.images', function (err, models) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(models, imagesIterator, callback);
        });
      },
      function historyoneImages (callback) {
        HistoryOneModel.find({ 'data.files': { $exists: true } }, 'data.images', function (err, models) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(models, imagesIterator, callback);
        });
      },

      function imageCloudinary (callback, next_cursor) {
        if (next_cursor) {
          config.next_cursor = next_cursor;
        }
        cloudinary.api.resources(function (result) {
          var images = result.resources;
          _.each(images, function (img) {
            imagesIdCloudinary.push(img.public_id);
          });
          if (result && result.next_cursor) {
            imageCloudinary(callback, result.next_cursor);
          } else {
            return callback(null);
          }
        }, config);
      },

      function imagesDelta (callback) {
        imagesIdDatabase = _.sortBy(imagesIdDatabase, 'name');
        imagesIdCloudinary = _.sortBy(imagesIdCloudinary, 'name');
        imagesIdDatabase = _.uniq(imagesIdDatabase);
        imagesIdCloudinary = _.uniq(imagesIdCloudinary);
        var delta = _.difference(imagesIdCloudinary, imagesIdDatabase);
        count.delta = delta.length;
        return callback(null);
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err + ' ');
        return done();
      }

      var durartion = Date.now() - start;
      grunt.log.ok('Rooms : (' + count.room.found + ' room(s) found and ' + count.room.avatarfound + ' avatar(s) room found ' + count.room.posterfound + ' poster(s) room found)');
      grunt.log.ok('Users : (' + count.user.found + ' user(s) found and ' + count.user.avatarfound + ' avatar(s) user found ' + count.user.posterfound + ' poster(s) user found)');
      grunt.log.ok('HistroyRoom : (' + count.historyroom.found + ' event(s) found and ' + count.historyroom.imagefound + ' image(s) historyroom found)');
      grunt.log.ok('HistoryOne : (' + count.historyone.found + ' event(s) found and ' + count.historyone.imagefound + ' image(s) historyone found)');
      grunt.log.ok(imagesIdDatabase.length + ' public_id database found  and ' + imagesIdCloudinary.length + ' public_id cloudinary <==> delta : ' + count.delta);
      grunt.log.ok('Successfully done, in ' + durartion + 'ms');
      done();
    });
  });
};
