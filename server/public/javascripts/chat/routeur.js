define([
  'underscore',
  'backbone',
  'models/client',
  'views/main'
], function (_, Backbone, client, mainView) {
  var ChatRouter = Backbone.Router.extend({
    routes: {
      '':                 'root',
      'room/:name':       'focusRoom',
      'user/:user':       'focusOneToOne',
      'account':          'focusAccount',
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
//      console.log('router: home');
      mainView.focusHome();
    },

    focusRoom: function(name) {
//      console.log('router: focusRoom '+name);
      mainView.focusRoomByName('#'+name);
    },

    focusOneToOne: function(username) {
//      console.log('router: focusOneToOne ' + username);
      mainView.focusOneToOneByUsername(username);
    },

    focusAccount: function(username) {
//      console.log('router: focusAccount');
      mainView.focusAccount(username);
    },

    default: function() {
//      console.log('router: default');
      Backbone.history.navigate('#', {trigger: true}); // redirect on home
    }
  });

  return new ChatRouter();
});
