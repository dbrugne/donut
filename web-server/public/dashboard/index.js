require.config({
  paths: {
    'jquery'                      : '../vendor/jquery/jquery',
    'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
    'text'                        : '../vendor/requirejs-text/text',
    'socket.io'                   : './socket.io-0.8.7',
    'underscore'                  : '../vendor/underscore-amd/underscore',
    'backbone'                    : '../vendor/backbone-amd/backbone',
    'moment'                      : '../vendor/moment/moment',
    'moment-fr'                   : '../vendor/moment/lang/fr',
    'jquery.linkify'              : '../javascripts/plugins/jquery.linkify',
    'jquery.cloudinary'           : '../vendor/cloudinary_js/js/jquery.cloudinary',
    'jquery.cloudinary-donut'     : '/cloudinary',
    'jquery.ui.widget'            : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
    'jquery.iframe-transport'     : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
    'jquery.fileupload'           : '../vendor/blueimp-file-upload/js/jquery.fileupload',
    'backgrid'                    : '../vendor/backgrid/lib/backgrid',
    'backbone.paginator'          : '../vendor/backbone.paginator/lib/backbone.paginator',
    'backgrid.paginator'          : '../vendor/backgrid-paginator/backgrid-paginator',
    'backgrid-moment-cell'        : '../vendor/backgrid-moment-cell/backgrid-moment-cell',
    'backgrid-filter'             : '../vendor/backgrid-filter/backgrid-filter',
    'backbone.bootstrap-modal'    : '../javascripts/plugins/backbone.bootstrap-modal',
    'jquery-jsonview'             : '../vendor/jquery-jsonview/dist/jquery.jsonview',
    'keen-js'                     : '../vendor/keen-js/dist/keen'
  },
  shim: {
    'bootstrap'               : ['jquery'],
    'jquery.cloudinary'       : ['jquery'],
    'jquery.cloudinary-donut' : ['jquery'],
    'jquery-jsonview'         : ['jquery'],
    'jquery.linkify'          : ['jquery'],
    'backbone.bootstrap-modal': ['jquery'],

    'backgrid': {
      deps: ['jquery'],
      exports: 'Backgrid'
    },
    'backgrid-moment-cell'  : ['backgrid', 'moment'],
    'backgrid-filter'       : ['backgrid'],
    'socket.io': { exports: 'io' },
    'keen-js': { exports: 'Keen' }
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
  'moment',
  /************************************
   * Load (once) and attach plugins to jQuery and underscore
   ************************************/
  'bootstrap',
  'backgrid',
  'backbone.paginator',
  'backgrid.paginator',
  'backgrid-moment-cell',
  'backgrid-filter',
  'jquery.cloudinary',
  'jquery.cloudinary-donut',
  'backbone.bootstrap-modal',
  'jquery.linkify',
  'moment-fr',
  'jquery-jsonview'
], function (Router, $, _, Backbone, io, moment) {

  // @todo : ouille!
  window.io = io;

  // moment
  moment.lang('fr');

  // Cloudinary setup
  $.cloudinary.config({
    cloud_name: window.cloudinary_cloud_name,
    api_key: window.cloudinary_api_key
  });

  // run
  router = new Router();
  Backbone.history.start();

});