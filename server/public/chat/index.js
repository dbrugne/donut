require.config({
  paths: {
      'jquery'                    : '../vendor/jquery/dist/jquery',
      'bootstrap'                 : '../vendor/bootstrap/dist/js/bootstrap',
      'text'                      : '../vendor/requirejs-text/text',
      'socket.io'                 : '/socket.io/socket.io',
      'underscore'                : '../vendor/underscore-amd/underscore',
      'backbone'                  : '../vendor/backbone-amd/backbone',
      'i18next'                   : '../vendor/i18next/i18next.amd.withJQuery',
      'moment'                    : '../vendor/moment/moment',
      'moment-fr'                 : '../vendor/moment/lang/fr',
      'facebook'                  : '//connect.facebook.net/en_US/all',
      'jquery.ui.widget'          : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
      'jquery.iframe-transport'   : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
      'jquery.fileupload'         : '../vendor/blueimp-file-upload/js/jquery.fileupload',
      'jquery.cloudinary'         : '../vendor/cloudinary_js/js/jquery.cloudinary',
      'jquery.scroller'           : '../vendor/Scroller/jquery.fs.scroller.min',
      'jquery.insertatcaret'      : '../javascripts/plugins/jquery.insertatcaret',
      'jquery.maxlength'          : '../javascripts/plugins/jquery.maxlength',
      'jquery.linkify'            : '../javascripts/plugins/jquery.linkify.min',
      'jquery.smilify'            : '../javascripts/plugins/jquery.smilify',
      'jquery.momentify'          : '../javascripts/plugins/jquery.momentify',
      'jquery.colorify'           : '../javascripts/plugins/jquery.colorify'
  },
  shim: {
    'jquery.cloudinary'     : ['jquery'],
    'jquery.insertatcaret'  : ['jquery'],
    'jquery.maxlength'      : ['jquery'],
    'jquery.linkify'        : ['jquery'],
    'jquery.smilify'        : ['jquery'],
    'jquery.momentify'      : ['jquery'],
    'jquery.colorify'       : ['jquery'],
    'jquery.scroller'       : ['jquery'],
    'bootstrap': {
      deps: ['jquery']
    },
    'facebook' : {
      exports: 'FB'
    }
  }
});

require(['app'], function (app) {
  app.initialize();
});