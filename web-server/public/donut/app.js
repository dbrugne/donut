define([
  'jquery',
  'underscore',
  'backbone',
  'router',
  'models/client',
  'views/main'
], function ($, _, Backbone, router, client, mainView) {
  var App = {
    initialize: function() {
      // Render IHM
      mainView.run();

      // Give some object to global scope to allow other context to use it
      // @debug
      window.router = router;
      window.client = client;
      window.main   = mainView;

      // Establish connection
      client.connect();
    }
  };
  return App;
});