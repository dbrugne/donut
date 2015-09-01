define([
  'underscore',
  'backbone',
  'client',
  'views/main' // will load all needed subviews
], function (_, Backbone, client, mainView) {
  var DonutRouter = Backbone.Router.extend({
    routes: {
      '':                 'root',
      'room/:name':       'focusRoom',
      'user/:user':       'focusOneToOne',
      '*default':         'default'
    },

    clientOnline: false,

    initialize: function(options) {
      var that = this;
      // Watch for client connection state
      this.listenTo(mainView, 'ready', function() {
        that.clientOnline = true;
        Backbone.history.start();
      });
      this.listenTo(client, 'disconnect', function() {
        that.clientOnline = false;
        Backbone.history.stop();
      });
    },

    root: function() {
      mainView.focusHome();
    },

    focusRoom: function(name) {
      mainView.focusRoomByName('#'+name);
    },

    focusOneToOne: function (username) {
      mainView.focusOneToOneByUsername(username);
    },

    default: function() {
      Backbone.history.navigate('#', {trigger: true}); // redirect on home
    }
  });

  return new DonutRouter();
});
