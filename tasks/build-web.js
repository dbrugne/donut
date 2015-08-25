var async = require('async');
var _ = require('underscore');
var path = require('path');
var fs = require('fs');

module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-extend-config");
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jst');
  grunt.extendConfig({
    requirejs: {
      compile: {
        options: {
          baseUrl: './web-server/public/donut/',
          name: 'index',
          out: './web-server/public/build/donut-'+Date.now()+'.js',
          onModuleBundleComplete: function (data) {
            var lastBuildFile = './web-server/public/build/last.json';
            var filename = path.basename(data.path);
            fs.writeFileSync(lastBuildFile, JSON.stringify({build: filename}));
            grunt.log.write('Last build file was written with value: '+filename+' ').ok();
          },
          preserveLicenseComments: false,
          //optimize: 'none', // could disabled uglyfication
          paths: {
            '_templates'                  : '../build/templates',
            '_translations'               : '../build/translations',
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
            'moment-fr'                   : '../vendor/moment/locale/fr',
            'facebook'                    : 'empty:',
            'desktop-notify'              : '../vendor/html5-desktop-notifications/desktop-notify',
            'jquery.ui.widget'            : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
            'jquery.iframe-transport'     : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
            'jquery.fileupload'           : '../vendor/blueimp-file-upload/js/jquery.fileupload',
            'jquery.cloudinary'           : '../vendor/cloudinary_js/js/jquery.cloudinary',
            'cloudinary.widget'           : 'empty:',
            'jquery.cloudinary-donut'     : '../../../shared/cloudinary/cloudinary',
            'jquery.insertatcaret'        : '../javascripts/plugins/jquery.insertatcaret',
            'jquery.maxlength'            : '../javascripts/plugins/jquery.maxlength',
            'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
            'jquery.smilify'              : '../javascripts/plugins/jquery.smilify',
            'jquery.momentify'            : '../javascripts/plugins/jquery.momentify',
            'jquery.socialify'            : '../javascripts/plugins/jquery.socialify',
            'html.sortable'               : '../vendor/html.sortable/dist/html.sortable',
            'jquery.contactform'          : '../javascripts/plugins/jquery.contactform',
            'common'                      : '../vendor/donut-common/index'
          },
          shim: {
            'bootstrap'                   : ['jquery'],
            'jquery.cloudinary'           : ['jquery'],
            'jquery.cloudinary-donut'     : ['jquery'],
            'jquery.insertatcaret'        : ['jquery'],
            'jquery.maxlength'            : ['jquery'],
            'jquery.linkify'              : ['jquery'],
            'jquery.smilify'              : ['jquery'],
            'jquery.momentify'            : ['jquery'],
            'jquery.socialify'            : ['jquery'],
            'jquery.contactform'          : ['jquery'],
            'cloudinary.widget'           : ['jquery'],
            'html.sortable'               : ['jquery'],
            'facebook' : {
              exports: 'FB'
            },
            'desktop-notify': {
              exports: 'notify'
            }
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
            'web-server/public/donut/templates/**/*.html'
          ]
        }
      }
    }
  });

  grunt.registerTask('i18next', function() {
    var translations = {};

    var locales = './locales';
    var languages = fs.readdirSync(locales);
    _.each(languages, function(l) {
      translations[l] = {};
      var namespaces = fs.readdirSync(path.join(locales, l));
      _.each(namespaces, function(_ns) {
        var ns = _ns.replace('.json', '');
        var json = JSON.parse(fs.readFileSync(path.join(locales, l, _ns)));
        translations[l][ns] = json;
      });
    });

    translations = _.omit(translations, ['404', 'title', 'meta', 'email']);

    var content = 'define(function(){ return '+JSON.stringify(translations)+'; });';
    fs.writeFileSync('./web-server/public/build/translations.js', content, { flag: 'w+' });
  });

  grunt.registerTask('build-web', 'Build Web client templates and scripts',[
    'jst',
    'i18next',
    'requirejs'
  ]);
};
