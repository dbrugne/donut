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
       // for cloudinary upload, not really used but a sucker dev have implement AMD as a bastard
      'jquery.ui.widget'          : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
      'jquery.iframe-transport'   : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
      'jquery.fileupload'         : '../vendor/blueimp-file-upload/js/jquery.fileupload',
       // end of bastard
      'jquery.cloudinary'         : '../vendor/cloudinary_js/js/jquery.cloudinary',
      'jquery.insertatcaret'      : '../plugins/jquery.insertatcaret',
      'jquery.linkify'            : '../plugins/jquery.linkify.min',
      'jquery.smilify'            : '../plugins/jquery.smilify',
      'jquery.momentify'          : '../plugins/jquery.momentify',
      'jquery.colorify'           : '../plugins/jquery.colorify',
      'jquery.scroller'           : '../vendor/Scroller/jquery.fs.scroller.min'
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