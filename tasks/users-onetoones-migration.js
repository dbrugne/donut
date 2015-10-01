var async = require('async');
var UserModel = require('../shared/models/user');
var HistoryOneModel = require('../shared/models/historyone');

module.exports = function (grunt) {
  grunt.registerTask('migration-onetoones', function () {
    var done = this.async();

    var MoveToones = function (user, fn) {
      async.each(user.onetoones, function (one, callback) {
        HistoryOneModel.getLastMessage(user._id.toString(), one.toString(), function (err, doc) {
          if (err) {
            callback(err);
          }

          var lastDate = (doc && doc[0])
            ? doc[0].time
            : new Date();

          var oneElement = {
            user: one,
            lastactivity_at: lastDate
          };

          user.update({$addToSet: {'ones': oneElement}}, function (err) {
            return callback(err);
          });
        });
      }, function (err) {
        fn(err);
      });
    };

    async.waterfall([

      function getUsers (callback) {
        UserModel.find({onetoones: {$not: {$size: 0}}}).exec(function (err, users) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(users, MoveToones, callback);
        });
      },

      function removeOldField (callback) {
        UserModel.update({}, {$unset: {onetoones: ''}}, {multi: true}, function (err, result) {
          if (err) {
            return callback(err);
          }

          return callback(null);
        });
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err);
      }
      done(err);
    });
  });
};
