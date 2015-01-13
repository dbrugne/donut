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
            'lightbox'                    : '../vendor/lightbox/dist/ekko-lightbox',
            'text'                        : '../vendor/requirejs-text/text',
            'socket.io'                   : '../../node_modules/socket.io-client/socket.io',
            'pomelo'                      : './pomelo',
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
            'jquery.mcs'                  : '../vendor/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar',
            'jquery.mousewheel'           : '../vendor/jquery-mousewheel/jquery.mousewheel',
            'jquery.insertatcaret'        : '../javascripts/plugins/jquery.insertatcaret',
            'jquery.maxlength'            : '../javascripts/plugins/jquery.maxlength',
            'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
            'jquery.smilify'              : '../javascripts/plugins/jquery.smilify',
            'jquery.momentify'            : '../javascripts/plugins/jquery.momentify',
            'jquery.colorify'             : '../javascripts/plugins/jquery.colorify',
            'jquery.mentionsinput'        : '../javascripts/plugins/jquery.mentionsInput',
            'underscore.template-helpers' : '../javascripts/plugins/underscore.template-helpers'
          }
        }
      }
    }
  });

  // Load the plugin
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  // Custom tasks
  grunt.loadTasks('tasks');


};