module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      compile: {
        options: {
          baseUrl: './web-server/public/donut/',
          name: 'index',
          out: './web-server/public/build/donut-'+Date.now()+'.js',
          onModuleBundleComplete: function (data) {
            var lastBuildFile = './web-server/public/build/last.json';
            var filename = require('path').basename(data.path);
            require('fs').writeFileSync(lastBuildFile, JSON.stringify({build: filename}));
            grunt.log.write('Last build file was written with value: '+filename+' ').ok();
          },
          preserveLicenseComments: false,
          //optimize: 'none', // could disabled uglyfication
          paths: {
            'jquery'                      : '../vendor/jquery/jquery',
            'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
            'text'                        : '../vendor/requirejs-text/text',
            'socket.io'                   : '../../node_modules/socket.io-client/socket.io',
            'pomelo'                      : './libs/pomelo',
            'underscore'                  : '../vendor/underscore-amd/underscore',
            'backbone'                    : '../vendor/backbone-amd/backbone',
            'i18next'                     : '../vendor/i18next/i18next.amd.withJQuery',
            'moment'                      : '../vendor/moment/moment',
            'moment-fr'                   : '../vendor/moment/lang/fr',
            'facebook'                    : 'empty:',
            'jquery.ui.widget'            : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
            'jquery.iframe-transport'     : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
            'jquery.fileupload'           : '../vendor/blueimp-file-upload/js/jquery.fileupload',
            'jquery.cloudinary'           : '../vendor/cloudinary_js/js/jquery.cloudinary',
            'cloudinary.widget'           : '//widget.cloudinary.com/global/all',
            'jquery.cloudinary-donut'     : '../../../shared/cloudinary/cloudinary',
            'jquery.insertatcaret'        : '../javascripts/plugins/jquery.insertatcaret',
            'jquery.maxlength'            : '../javascripts/plugins/jquery.maxlength',
            'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
            'jquery.smilify'              : '../javascripts/plugins/jquery.smilify',
            'jquery.momentify'            : '../javascripts/plugins/jquery.momentify',
            'jquery.colorify'             : '../javascripts/plugins/jquery.colorify',
            'jquery.mentionsinput'        : '../javascripts/plugins/jquery.mentionsInput',
            'underscore.template-helpers' : '../javascripts/plugins/underscore.template-helpers',
            'html.sortable'               : '../vendor/html.sortable/dist/html.sortable'
          }
        }
      }
    },
    underscore_compile: {
      options: {
        // Task-specific options go here.
      },
      './web-server/public/build/templates.js': [
        './web-server/public/donut/templates/color-picker.html',
        './web-server/public/donut/templates/current-user.html',
        './web-server/public/donut/templates/discussions-block.html',
        './web-server/public/donut/templates/event/disconnected.html',
        './web-server/public/donut/templates/event/in-out-on-off.html',
        './web-server/public/donut/templates/event/message.html',
        './web-server/public/donut/templates/event/reconnected.html',
        './web-server/public/donut/templates/event/room-deop.html',
        './web-server/public/donut/templates/event/room-kick.html',
        './web-server/public/donut/templates/event/room-op.html',
        './web-server/public/donut/templates/event/room-topic.html',
        './web-server/public/donut/templates/events.html',
        './web-server/public/donut/templates/home-rooms.html',
        './web-server/public/donut/templates/home-users.html',
        './web-server/public/donut/templates/home.html',
        './web-server/public/donut/templates/image-uploader.html',
        './web-server/public/donut/templates/input.html',
        './web-server/public/donut/templates/onetoone.html',
        './web-server/public/donut/templates/room-create.html',
        './web-server/public/donut/templates/room-delete.html',
        './web-server/public/donut/templates/room-edit.html',
        './web-server/public/donut/templates/room-profile.html',
        './web-server/public/donut/templates/room-topic.html',
        './web-server/public/donut/templates/room-users-confirmation.html',
        './web-server/public/donut/templates/room-users-list.html',
        './web-server/public/donut/templates/room-users.html',
        './web-server/public/donut/templates/room.html',
        './web-server/public/donut/templates/spinner.html',
        './web-server/public/donut/templates/user-account.html',
        './web-server/public/donut/templates/user-edit.html',
        './web-server/public/donut/templates/user-profile.html'
      ]
    }
  });

  // Load the plugin
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-underscore-compile');

  // Custom tasks
  grunt.loadTasks('tasks');

};