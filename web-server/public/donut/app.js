define([
  'jquery',
  'underscore',
  'backbone',
  'libs/debug',
  'router',
  'models/client',
  'views/main'
], function ($, _, Backbone, debug, router, client, mainView) {
  var App = {
    initialize: function() {
      // Render IHM
      mainView.run();

      // @debug
      window.debug  = debug;
      window.router = router;
      window.client = client;
      window.main   = mainView;

      // Establish connection
      client.connect();
    }
  };
  return App;
});