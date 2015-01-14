define([
  'underscore',
  'backbone',
  'collections/users',
  'collections/rooms',
  'models/user',
  'models/room',
  'views/main',
  'views/home',
  'views/users',
  'views/user',
  'views/rooms',
  'views/room',
  'views/realtime'
], function (_, Backbone, users, rooms, UserModel, RoomModel, MainView, HomeView, UsersView, UserView, RoomsView, RoomView, RealtimeView) {
  var Router = Backbone.Router.extend({

    mainView     : null,
    homeView     : null,
    usersView    : null,
    roomsView    : null,
    realtimeView : null,

    routes: {
      '':                 'root',
      'users':            'users',
      'user/:id':        'user',
      'rooms':            'rooms',
      'room/:id':         'room',
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

    room: function(id) {
      id = id.replace('%23', '#');
      var model = new RoomModel({_id: id});
      var that = this;
      model.fetch({
        success: function(model) {
          that.mainView.currentView = new RoomView({
            model: model
          });
          that.mainView.render();
          that.mainView.setNavigationActive('rooms');
        },
        error: function(model, xhr, options) {
          console.log('Fetch room error');
        }
      });
    },

    users: function() {
      if (!this.usersView)
        this.usersView = new UsersView();

      this.mainView.currentView = this.usersView;
      this.mainView.render();
      this.mainView.setNavigationActive('users');
    },

    user: function(id) {
      var model = new UserModel({_id: id});
      var that = this;
      model.fetch({
        success: function(model) {
          that.mainView.currentView = new UserView({
            model: model
          });
          that.mainView.render();
          that.mainView.setNavigationActive('users');
        },
        error: function(model, xhr, options) {
          console.log('Fetch user error');
        }
      });
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
