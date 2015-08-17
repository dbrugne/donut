require.config({
  paths: {
    'jquery'                      : '../vendor/jquery/dist/jquery',
    'bootstrap'                   : '../vendor/bootstrap/dist/js/bootstrap',
    'text'                        : '../vendor/requirejs-text/text',
    'socket.io'                   : './socket.io-0.8.7',
    'underscore'                  : '../vendor/underscore-amd/underscore',
    'backbone'                    : '../vendor/backbone-amd/backbone',
    'moment'                      : '../vendor/moment/moment',
    'moment-fr'                   : '../vendor/moment/lang/fr',
    'jquery.cloudinary'           : '../vendor/cloudinary_js/js/jquery.cloudinary',
    'jquery.cloudinary-donut'     : '/cloudinary',
    'jquery.ui.widget'            : '../vendor/blueimp-file-upload/js/vendor/jquery.ui.widget',
    'jquery.iframe-transport'     : '../vendor/blueimp-file-upload/js/jquery.iframe-transport',
    'jquery.fileupload'           : '../vendor/blueimp-file-upload/js/jquery.fileupload',
    'backgrid'                    : './bower_components/backgrid/lib/backgrid',
    'backbone.paginator'          : './bower_components/backbone.paginator/lib/backbone.paginator',
    'backgrid.paginator'          : './bower_components/backgrid-paginator/backgrid-paginator',
    'backgrid-moment-cell'        : './bower_components/backgrid-moment-cell/backgrid-moment-cell',
    'backgrid-filter'             : './bower_components/backgrid-filter/backgrid-filter',
    'backbone.bootstrap-modal'    : '../javascripts/plugins/backbone.bootstrap-modal',
    'jquery-jsonview'             : './bower_components/jquery-jsonview/dist/jquery.jsonview',
    'keen-js'                     : './bower_components/keen-js/dist/keen'
  },
  shim: {
    'bootstrap'               : ['jquery'],
    'jquery.cloudinary'       : ['jquery'],
    'jquery.cloudinary-donut' : ['jquery'],
    'jquery-jsonview'         : ['jquery'],
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