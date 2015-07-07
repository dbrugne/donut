var async = require('async');
var _ = require('underscore');
var UserModel = require('../shared/models/user');
var NotificationModel = require('../shared/models/notification');

module.exports = function (grunt) {

  grunt.loadNpmTasks("grunt-extend-config");
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      usernameFrom: {
        options: {
          questions: [{
            config: 'usernameFrom',
            type: 'input',
            message: 'Choose a "from" username',
            default: 'david'
          }]
        }
      },
      usernameTo: {
        options: {
          questions: [{
            config: 'usernameTo',
            type: 'input',
            message: 'Choose a "to" username',
            default: 'damien'
          }]
        }
      }
    }
  });

  grunt.registerTask('donut-create-test-notifications', function () {

    var usernameFrom = grunt.config('usernameFrom') || 'david';
    var usernameTo = grunt.config('usernameTo') || 'damien';

    var done = this.async();

    async.waterfall([

      function retrieveUsers(callback) {
        UserModel.findByUsername(usernameFrom).exec(function (err, userFrom) {
          if (err)
            return callback('Error while retrieving user from '+usernameFrom+': '+err);
          if (!userFrom)
            return callback('Unable to retrieve user: '+usernameFrom);

          UserModel.findByUsername(usernameTo).exec(function (err, userTo) {
            if (err)
              return callback('Error while retrieving user from '+usernameTo+': '+err);
            if (!userTo)
              return callback('Unable to retrieve user: '+usernameTo);

            return callback(null, userFrom, userTo);
          });
        });
      },

      function create(userFrom, userTo, callback) {
        var model = NotificationModel.getNewModel('usermessage', userTo, {
          user: userFrom.id,
          by_user: userTo.id
        });
        model.to_browser = false;
        model.to_email = true;
        model.to_mobile = true;
        model.save(callback);
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err);
        done();
      } else {
        grunt.log.ok('Successfully done');
        done();
      }
    });

  });

  grunt.registerTask('donut-test-notifications', 'Create a set of test notifications in database',[
    'prompt:usernameFrom',
    'prompt:usernameTo',
    'donut-create-test-notifications'
  ]);
};
