require.config({
  paths: {
      'jquery': '../vendor/jquery/dist/jquery',
      'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
      'text': '../vendor/requirejs-text/text',
      'socket.io': '/socket.io/socket.io',
      'underscore': '../vendor/underscore-amd/underscore',
      'backbone': '../vendor/backbone-amd/backbone',
       // for cloudinary upload, not really used but a sucker dev have implement AMD as a bastard
      'jquery.ui.widget': '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
      'jquery.iframe-transport': '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
      'jquery.fileupload': '../vendor/blueimp-file-upload/js/jquery.fileupload',
       // end of bastard
      'jquery.cloudinary': '../vendor/cloudinary_js/js/jquery.cloudinary',
      'jquery.dateformat': '../plugins/jquery.dateformat',
      'jquery.insertatcaret': '../plugins/jquery.insertatcaret'
  },
  shim: {
    'jquery.cloudinary': ['jquery'],
    'jquery.dateformat': ['jquery'],
    'jquery.insertatcaret': ['jquery'],
    'jquery.bootstrap': {
      deps: ['jquery']
    }
  }
});

//require(['jquery', 'bootstrap'], function ($, bootstrap) {
//  // some custom jquery to do on raw DOM?
//});

require(['app'], function (app) {
  app.initialize();
});