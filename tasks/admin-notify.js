var async = require('async');
var _ = require('underscore');
var UserModel = require('../shared/models/user');
var PomeloBridge = require('../ws-server/app/components/bridge').Bridge;

module.exports = function (grunt) {

  grunt.loadNpmTasks("grunt-extend-config");
  grunt.loadNpmTasks('grunt-prompt');
  grunt.extendConfig({
    prompt: {
      adminNotifyUsernameTo: {
        options: {
          questions: [{
            config: 'usernameTo',
            type: 'input',
            message: 'Type username of receiver',
            default: 'yangs'
          }]
        }
      },
      adminNotifyConfirmation: {
        options: {
          questions: [{
            config: 'confirmation',
            type: 'confirm',
            message: 'Are you sure, a message will be sent ALL CONNECTED USERS?',
            default: true
          }]
        }
      },
      adminNotifyMessage: {
        options: {
          questions: [{
            config: 'message',
            type: 'input',
            message: 'Type the message to send to ALL CONNECTED USERS',
            default: "DONUT s'améliore, redémarrage de la plateforme dans quelques secondes ..."
          }]
        }
      }
    }
  });

  var getPomeloBridge = function() {
    var configuration = grunt.config('pomelo');
    return PomeloBridge({
      masterId  : configuration.master.id,
      host      : configuration.master.host,
      port      : configuration.master.port,
      username  : configuration.adminUser[0].username,
      password  : configuration.adminUser[0].password
    });
  };

  grunt.registerTask('admin-notify-reload-send', function () {
    if (grunt.config('confirmation') !== true)
      return grunt.fail.fatal('Operation aborted by user');

    var bridge = getPomeloBridge();

    var done = this.async();
    bridge.notify('chat', 'adminNotifyTask.notifyReload', {}, function (err) {
      if (err)
        grunt.log.error(err);
      else
        grunt.log.ok('Successfully done');
      done();
    });
  });

  grunt.registerTask('admin-notify-exit-send', function () {
    if (!grunt.config('usernameTo'))
      return grunt.fail.fatal('Username is mandatory');

    var bridge = getPomeloBridge();

    var done = this.async();
    UserModel.findByUsername(grunt.config('usernameTo')).exec(function (err, user) {
      if (err)
        return grunt.fail.fatal(err);
      if (!user)
        return grunt.fail.fatal('Unable to retrieve user: '+username);

      bridge.notify('chat', 'adminNotifyTask.notifyExit', {
        user_id: user.id
      }, function (err) {
        if (err)
          grunt.log.error(err);
        else
          grunt.log.ok('Successfully done');
        done();
      });
    });
  });

  grunt.registerTask('admin-notify-message-send', function () {
    if (!grunt.config('message'))
      return grunt.fail.fatal('Message is mandatory');

    var bridge = getPomeloBridge();

    var done = this.async();
    bridge.notify('chat', 'adminNotifyTask.notifyMessage', { message: grunt.config('message') }, function (err) {
      if (err)
        grunt.log.error(err);
      else
        grunt.log.ok('Successfully done');
      done();
    });
  });

  grunt.registerTask('admin-notify-reload', 'Send a reload (refresh page) signal to all connected client',[
    'load-pomelo-configuration',
    'prompt:adminNotifyConfirmation',
    'admin-notify-reload-send'
  ]);
  grunt.registerTask('admin-notify-exit', 'Send an exit (redirect on landing) signal to a particular client',[
    'load-pomelo-configuration',
    'prompt:adminNotifyUsernameTo',
    'admin-notify-exit-send'
  ]);
  grunt.registerTask('admin-notify-message', 'Send a message in all opened discussions to all connected client',[
    'load-pomelo-configuration',
    'prompt:adminNotifyMessage',
    'admin-notify-message-send'
  ]);
};
