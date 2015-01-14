require.config({
  paths: {
    'jquery'                      : '../../vendor/jquery/jquery',
    'bootstrap'                   : '../../vendor/bootstrap/dist/js/bootstrap',
    'text'                        : '../../vendor/requirejs-text/text',
    'socket.io'                   : './socket.io-0.8.7',
    'underscore'                  : '../../vendor/underscore-amd/underscore',
    'backbone'                    : '../../vendor/backbone-amd/backbone',
    'moment'                      : '../../vendor/moment/moment',
    'moment-fr'                   : '../../vendor/moment/lang/fr',
    'jquery.cloudinary'           : '../../vendor/cloudinary_js/js/jquery.cloudinary',
    'jquery.cloudinary-donut'     : '/cloudinary',
    'jquery.ui.widget'            : '../../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
    'jquery.iframe-transport'     : '../../vendor/blueimp-file-upload/js/jquery.iframe-transport',
    'jquery.fileupload'           : '../../vendor/blueimp-file-upload/js/jquery.fileupload',
    'backgrid'                    : '../../vendor/backgrid/lib/backgrid',
    'backbone.paginator'          : '../../vendor/backbone.paginator/lib/backbone.paginator',
    'backgrid.paginator'          : '../../vendor/backgrid-paginator/backgrid-paginator',
    'backgrid-moment-cell'        : '../../vendor/backgrid-moment-cell/backgrid-moment-cell',
    'backgrid-filter'             : '../../vendor/backgrid-filter/backgrid-filter',
    'backbone.bootstrap-modal'    : '../plugins/backbone.bootstrap-modal'
  },
  shim: {
    'jquery.cloudinary'      : ['jquery'],
    'jquery.cloudinary-donut': ['jquery'],
    'backgrid': {
      deps: ['jquery'],
      exports: 'Backgrid'
    },
    'backgrid-moment-cell': {
      deps: ['backgrid', 'moment']
    },
    'backgrid-filter': {
      deps: ['backgrid']
    },
    'bootstrap': {
      deps: ['jquery']
    },
    'socket.io': {
      exports: 'io'
    }
  }
});

require([
  'router',
  /************************************
   * Load librairies
   ************************************/
  'jquery',
  'underscore',
  'backbone',
  'socket.io',
  /************************************
   * Load (once) and attach plugins to jQuery and underscore
   ************************************/
  'backgrid',
  'backbone.paginator',
  'backgrid.paginator',
  'backgrid-moment-cell',
  'backgrid-filter',
  'jquery.cloudinary',
  'jquery.cloudinary-donut',
  'backbone.bootstrap-modal'
], function (Router, $, _, Backbone, io) {

  // @todo : ouille!
  window.io = io;

  // Cloudinary setup
  $.cloudinary.config({
    cloud_name: window.cloudinary_cloud_name,
    api_key: window.cloudinary_api_key
  });

  // run
  router = new Router();
  Backbone.history.start();

});