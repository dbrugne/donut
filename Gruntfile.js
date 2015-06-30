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
            '_templates'                  : '../build/templates',
            'debug'                       : '../vendor/visionmedia-debug/dist/debug',
            'jquery'                      : '../vendor/jquery/dist/jquery',
            'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
            'text'                        : '../vendor/requirejs-text/text',
            'socket.io'                   : '../../../node_modules/socket.io-client/socket.io',
            'pomelo'                      : './libs/pomelo',
            'underscore'                  : '../vendor/underscore-amd/underscore',
            'backbone'                    : '../vendor/backbone-amd/backbone',
            'i18next'                     : '../vendor/i18next/i18next.amd.withJQuery',
            'moment'                      : '../vendor/moment/moment',
            'moment-fr'                   : '../vendor/moment/lang/fr',
            'facebook'                    : 'empty:',
            'desktop-notify'              : '../vendor/html5-desktop-notifications/desktop-notify',
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
            'jquery.socialify'            : '../javascripts/plugins/jquery.socialify',
            'jquery.mentionsinput'        : '../javascripts/plugins/jquery.mentionsInput',
            'underscore.template-helpers' : '../javascripts/plugins/underscore.template-helpers',
            'html.sortable'               : '../vendor/html.sortable/dist/html.sortable',
            'jquery.contactform'          : '../javascripts/plugins/jquery.contactform'
          }
        }
      }
    },
    jst: {
      compile: {
        options: {
          amd: true,
          processName: function(filename) {
            return filename.replace('web-server/public/donut/templates/', '');
          }
        },
        files: {
          'web-server/public/build/templates.js': [
            'web-server/public/donut/templates/*.html',
            'web-server/public/donut/templates/event/*.html'
          ]
        }
      }
    }
  });

  // Load the plugin
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jst');

  // Custom tasks
  grunt.loadTasks('tasks');

};