require.config({
  paths: {
      'jquery': '../vendor/jquery/dist/jquery',
      'bootstrap': '../vendor/bootstrap/dist/js/bootstrap',
      'text': '../vendor/requirejs-text/text',
      'socket.io': '/socket.io/socket.io',
      'underscore': '../vendor/underscore-amd/underscore',
      'backbone': '../vendor/backbone-amd/backbone',
      'jquery.dateformat': '../plugins/jquery.dateformat',
      'jquery.insertatcaret': '../plugins/jquery.insertatcaret'
  },
  shim: {
    'jquery.dateformat': ['jquery'],
    'jquery.insertatcaret': ['jquery'],
    'jquery.bootstrap': {
      deps: ['jquery']
    }
  }
});

//require(['jquery', 'bootstrap'], function ($, bootstrap) {
//  //
//});

require(['router'], function (Router) {
  Router.initialize();
});