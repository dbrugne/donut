define([
  'underscore',
  'backbone',
  'views/main',
  'views/home',
  'views/users',
  'views/rooms',
  'views/realtime'
], function (_, Backbone, MainView, HomeView, UsersView, RoomsView, RealtimeView) {
  var Router = Backbone.Router.extend({

    mainView     : null,
    homeView     : null,
    usersView    : null,
    userView     : null,
    roomsView    : null,
    roomView     : null,
    realtimeView : null,

    routes: {
      '':                 'root',
      'users':            'users',
      'users/:user':      'user',
      'rooms':            'rooms',
      'rooms/:name':      'room',
      'realtime':         'realtime',
      '*default':         'default'
    },

    initialize: function(options) {
      this.mainView = new MainView();
    },

    root: function() {
      if (!this.homeView)
        this.homeView = new HomeView();

      this.mainView.currentView = this.homeView;
      this.mainView.render();
    },

    rooms: function() {
      if (!this.roomsView)
        this.roomsView = new RoomsView();

      this.mainView.currentView = this.roomsView;
      this.mainView.render();
      this.mainView.setNavigationActive('rooms');
    },

    users: function() {
      if (!this.usersView)
        this.usersView = new UsersView();

      this.mainView.currentView = this.usersView;
      this.mainView.render();
      this.mainView.setNavigationActive('users');
    },

    realtime: function() {
      if (!this.realtimeView)
        this.realtimeView = new RealtimeView();

      this.mainView.currentView = this.realtimeView;
      this.mainView.render();
      this.mainView.setNavigationActive('realtime');
    },


    default: function() {
//      console.log('router: default');
      Backbone.history.navigate('#', {trigger: true}); // redirect on home
    }
  });

  return Router;
});
