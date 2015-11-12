var async = require('async');
var UserModel = require('../shared/models/user');

module.exports = function (grunt) {
  grunt.registerTask('migration-emails-confirmed', function () {
    var done = this.async();

    var MoveEmails = function (user, fn) {
      var emails = [];

      if (user.local && user.local.email) {
        emails.push({email: user.local.email, confirmed: true});
      }
      if (user.facebook && user.facebook.email) {
        emails.push({email: user.facebook.email, confirmed: true});
      }
      user.emails = emails;
      user.confirmed = true;
      user.save(function (err) {
        return fn(err);
      });
    };

    async.waterfall([

      function getUsers (callback) {
        UserModel.find({}).exec(function (err, users) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(users, MoveEmails, callback);
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