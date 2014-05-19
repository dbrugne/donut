define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'views/window',
  'views/status',
  'views/alert',
  'views/home',
  'views/onlines',
  'views/room-create',
  'views/room-search',
  'views/user-search',
  'views/room-panel',
  'views/onetoone-panel',
  'views/room-block',
  'views/onetoone-block',
  'views/user-profile', // need to be loaded here to instantiate DOM
  'views/room-profile' // idem
], function ($, _, Backbone, client, rooms, onetoones, currentUser, windowView,
             statusView, alertView, homeView, onlinesView, RoomCreateView,
             RoomSearchView, UserSearchView, RoomPanelView, OneToOnePanelView,
             RoomBlockView, OnetooneBlockView, userProfileView, roomProfileView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $discussionsPanelsContainer: $("#chat-center"),

    thisDiscussionShouldBeFocusedOnSuccess: '',

    events: {
      'click #search-room-link':    'openSearchRoomModal',
      'click #create-room-link':    'openCreateRoomModal',
      'click #search-user-link':    'openSearchUserModal',
      'click .open-user-profile':     'openUserProfile',
      'dblclick .dbl-open-user-profile': 'openUserProfile',
      'click .close-room':          'onCloseDiscussion',
      'click .close-onetoone':      'onCloseDiscussion'
    },

    initialize: function() {
      this.listenTo(client, 'welcome', this.onWelcome);

      this.listenTo(rooms, 'add', this.onRoomPong);
//      this.listenTo(rooms, 'remove', this.onRoomRemove);
      this.listenTo(onetoones, 'add', this.onOnePong);
//      this.listenTo(onetoones, 'remove', this.onRoomRemove);

      this.roomBlockView = new RoomBlockView({collection: rooms});
      this.onetooneBlockView = new OnetooneBlockView({collection: onetoones});
    },

    alert: function(type, message) {
      if (!type) {
        type = 'info';
      }
      alertView.show(type, message);
    },

    _handleAction: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $('.modal').modal('hide');
    },

    /**
     * Executed each time the connexion with server is re-up
     * (can occurs multiple time in a session)
     * @param data
     */
    onWelcome: function(data) {
      // Update current user data
      _.each(Object.keys(data.user), function(propertyKey) {
        currentUser.set(propertyKey, data.user[propertyKey]);
      });
      console.log('Hello '+currentUser.get('username')+'!');

      // Render home
      homeView.render(data.home);

      // Render onlines
      // @todo : data.onlines

      // Join #General
      client.join('#General'); // @todo : should be called on collection

      // Join rooms
      _.each(data.rooms, function(room) {
        client.join(room); // @todo : should be called on collection
      });

      // Open onetoones
      _.each(data.onetoones, function(onetoone) {
        client.open(onetoone); // @todo : should be called on collection
      });

      // Run routing
      this.trigger('ready');
    },

    // MODALS
    // ======================================================================

    openSearchRoomModal: function() {
      if (!this.searchRoomModal) {
        this.searchRoomModal = new RoomSearchView({mainView: this});
        this.searchRoomModal.search();
      }
      this.searchRoomModal.show();
    },

    openCreateRoomModal: function() {
      if (!this.createRoomModal) {
        this.createRoomModal = new RoomCreateView({mainView: this});
      }
      this.createRoomModal.show();
    },

    openSearchUserModal: function() {
      if (!this.userSearchModal) {
        this.userSearchModal = new UserSearchView({mainView: this});
        this.userSearchModal.search();
      }
      this.userSearchModal.show();
    },

    openUserProfile: function(event) {
      this._handleAction(event);
      var userId = $(event.currentTarget).data('userId');
      if (userId) {
        client.userProfile(userId);
      }
      return false; // stop propagation
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    onRoomPong: function(model, collection, options) {
      var view = new RoomPanelView({
        collection: collection,
        model:      model
      });
      this.$discussionsPanelsContainer.append(view.$el);

      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('name')) {
        this.focus(model);
      }
    },

    onOnePong: function(model, collection, options) {
      var view = new OneToOnePanelView({
        collection: collection,
        model:      model
      });
      this.$discussionsPanelsContainer.append(view.$el);

      // If caller indicate that this room should be focused on success
      //  OR if this is the first opened discussion
      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('username')
        || this.length == 1) {
        this.focus(model);
      }
    },

    onCloseDiscussion: function(event) {
      this._handleAction(event);

      var $currentTarget = $(event.currentTarget);

      if ($currentTarget.hasClass('close-room')) {
        var name = $currentTarget.data('name');
        if (!name) return false;
        this.closeRoom(name);
      } else if ($currentTarget.hasClass('close-onetoone')) {
        var username = $currentTarget.data('username');
        if (!username) return false;
        this.closeOne(username);
      }

      return false; // stop propagation
    },

    closeRoom: function(name) {
      var model = rooms.findWhere({ name: name });
      if (model == undefined) return;

      // Remove entity (on remove: panel will autodestroy and model will client.leave)
      rooms.remove(model);

      // Focus default
      this.focusHome();
    },

    closeOne: function(username) {
      var model = onetoones.findWhere({ username: username });
      if (model == undefined) return;

      // Remove entity (on remove: panel will autodestroy and model will client.close)
      onetoones.remove(model);

      // Focus default
      this.focusHome();
    },

    // FOCUS TAB/PANEL MANAGEMENT
    // ======================================================================

    unfocusAll: function() {
      rooms.each(function(o, key, list) {
        o.set('focused', false);
      });
      onetoones.each(function(o, key, list) {
        o.set('focused', false);
      });
      this.$home.hide();
    },

    // called by router only
    focusHome: function() {
      this.unfocusAll();
      this.$home.show();
      this.roomBlockView.render();
      this.onetooneBlockView.render();
    },

    // called by router only
    focusRoomByName: function(name) {
      var model = rooms.findWhere({ name: name });
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = name;
        rooms.openPing(name);
        return;
      } else {
        this.focus(model);
      }
    },

    // called by router only
    focusOneToOneByUsername: function(username) {
      var model = onetoones.findWhere({ username: username });
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = username;
        onetoones.openPing(username);
        return;
      } else {
        this.focus(model);
      }
    },

    focus: function(model) {
      // No opened discussion, display default
      if (rooms.length < 1 && onetoones.length < 1) {
        return this.focusHome();
      }

      // No discussion provided, take first
      if (model == undefined) {
        model = rooms.first();
        if (model == undefined) {
          model = onetoones.first();
          if (model == undefined) {
            return this.focusHome();
          }
        }
      }

      // Unfocus every model
      this.unfocusAll();

      // Focus the one we want
      model.set('focused', true);
      this.roomBlockView.render();
      this.onetooneBlockView.render();

      // Update URL
//      var uri;
//      if (model.get('type') == 'room') {
//        uri = 'room/'+model.get('name').replace('#', '');
//      } else {
//        uri = 'user/'+model.get('username');
//      }
//      Backbone.history.navigate(uri); // @todo : warning! focusing a room should be done only by router, so the URL is already up to date no ? => to confirm and then delete this block
      // @todo : bug when closing a panel and focusing another discussion
    }

  });

  return new MainView();
});