'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'router',
  'client',
  'views/main'
], function ($, _, Backbone, router, client, mainView) {
  var App = {
    initialize: function () {
      // Render IHM
      mainView.run();

      // @debug
      window.router = router;
      window.client = client;
      window.main = mainView;

      // Establish connection
      client.connect();
    }
  };
  return App;
});
