require.config({
  paths: {
      'jquery'                    : '../javascripts/vendor/jquery/dist/jquery',
      'bootstrap'                 : '../javascripts/vendor/bootstrap/dist/js/bootstrap',
      'text'                      : '../javascripts/vendor/requirejs-text/text',
      'socket.io'                 : '/socket.io/socket.io',
      'underscore'                : '../javascripts/vendor/underscore-amd/underscore',
      'backbone'                  : '../javascripts/vendor/backbone-amd/backbone',
      'i18next'                   : '../javascripts/vendor/i18next/i18next.amd.withJQuery',
      'moment'                    : '../javascripts/vendor/moment/moment',
      'moment-fr'                 : '../javascripts/vendor/moment/lang/fr',
       // for cloudinary upload, not really used but a sucker dev have implement AMD as a bastard
      'jquery.ui.widget'          : '../javascripts/vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
      'jquery.iframe-transport'   : '../javascripts/vendor/blueimp-file-upload/js/jquery.iframe-transport',
      'jquery.fileupload'         : '../javascripts/vendor/blueimp-file-upload/js/jquery.fileupload',
       // end of bastard
      'jquery.cloudinary'         : '../javascripts/vendor/cloudinary_js/js/jquery.cloudinary',
      'jquery.insertatcaret'      : '../javascripts/plugins/jquery.insertatcaret',
      'jquery.linkify'            : '../javascripts/plugins/jquery.linkify.min',
      'jquery.smilify'            : '../javascripts/plugins/jquery.smilify',
      'jquery.momentify'          : '../javascripts/plugins/jquery.momentify',
      'jquery.colorify'           : '../javascripts/plugins/jquery.colorify',
      'jquery.scroller'           : '../javascripts/vendor/Scroller/jquery.fs.scroller.min'
  },
  shim: {
    'jquery.cloudinary'     : ['jquery'],
    'jquery.insertatcaret'  : ['jquery'],
    'jquery.linkify'        : ['jquery'],
    'jquery.smilify'        : ['jquery'],
    'jquery.momentify'      : ['jquery'],
    'jquery.colorify'       : ['jquery'],
    'jquery.scroller'       : ['jquery'],
    'bootstrap': {
      deps: ['jquery']
    }
  }
});

require(['app'], function (app) {
  app.initialize();
});