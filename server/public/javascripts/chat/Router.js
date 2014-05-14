define([
  'underscore',
  'backbone',
  'models/client',
  'collections/discussions'
], function (_, Backbone, client, discussions) {
  var ChatRouter = Backbone.Router.extend({
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
      this.listenTo(client, 'connect', function() {
        that.clientOnline = true;
        Backbone.history.start();
      });
      this.listenTo(client, 'disconnect', function() {
        that.clientOnline = false;
        Backbone.history.stop();
      });
    },

    root: function() {
      console.log('router: home');
      // @todo : replace by default homepage
    },

    focusRoom: function(name) {
      console.log('router: focusRoom '+name);
      discussions.focusRoomByName('#'+name);
    },

    focusOneToOne: function(username) {
      console.log('router: focusOneToOne ' + username);
      discussions.focusOneToOneByUsername(username);
    },

    default: function() {
      console.log('router: default');
      // @todo : handle 404 type behavior in DOM
    }
  });

  return new ChatRouter();
});