define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'collections/discussions',
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
], function ($, _, Backbone, client, discussions, currentUser, windowView,
             statusView, alertView, homeView, onlinesView, RoomCreateView,
             RoomSearchView, UserSearchView, RoomPanelView, OneToOnePanelView,
             RoomBlockView, OnetooneBlockView, userProfileView, roomProfileView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $discussionsPanelsContainer: $("#chat-center"),

    events: {
      'click #search-room-link': 'openSearchRoomModal',
      'click #create-room-link': 'openCreateRoomModal',
      'click #search-user-link': 'openSearchUserModal',
      'click .open-user-profile': 'openUserProfile',
      'dblclick .dbl-open-user-profile': 'openUserProfile',
      'click .open-onetoone': 'openOneToOne',
      'click .close-onetoone': 'closeOneToOne'
    },

    initialize: function() {
      this.listenTo(client, 'welcome', this.onWelcome);

      this.listenTo(discussions, 'add', this.onAdd);
      this.listenTo(discussions, 'focusDefault', this.onFocusHome);
      this.listenTo(discussions, 'unfocusDefault', this.onUnfocusHome);

      this.roomBlockView = new RoomBlockView({collection: discussions});
      this.onetooneBlockView = new OnetooneBlockView({collection: discussions});
    },

    alert: function(type, message) {
      if (!type) {
        type = 'info';
      }
      alertView.show(type, message);
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
      client.join('#General');

      // Join rooms
      _.each(data.rooms, function(room) {
        client.join(room);
      });
    },

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

//    openOneToOne: function(event) {
//      this._handleAction(event);
//      var userId = $(event.currentTarget).data('userId');
//      if (userId) {
//        client.open(userId);
//        var one = discussions.get(userId);
//      }
//
//      return false; // stop propagation
//    },
//
//    closeOneToOne: function(event) {
//      this._handleAction(event);
//      var userId = $(event.currentTarget).data('userId');
//      if (userId) {
//        this.collection.remove(this.model); // remove model from collection
//
//        // After remove, the room still exists but is not in the collection,
//        // = .focus() call will choose another room to be focused
//        if (this.model.get('focused')) {
//          this.collection.focus();
//        }
//        client.close(userId);
//      }

      return false; // stop propagation
    },

    _handleAction: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $('.modal').modal('hide');
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    // @todo : replace by a method in main that ADD to collection and create views
    onAdd: function(model, collection, options) {
      if (model.get('type') == 'room') {
        var windowView = new RoomPanelView({ collection: collection, model: model });
                this.$discussionsPanelsContainer.append(windowView.$el);
      } else if (model.get('type') == 'onetoone') {
        var windowView = new OneToOnePanelView({ collection: collection, model: model });
        this.$discussionsPanelsContainer.append(windowView.$el);
      } else {
        return;
      }
    },
    // @todo : replace by a method in main that ADD to collection and create views

    openRoom: function(name) {
      // Is already opened?
      var room = discussions.get(name);
      if (room != undefined) {
        discussions.focus(room); // @todo : should use this.focus
      } else {
        // Room not already open
        discussions.thisDiscussionShouldBeFocusedOnSuccess = name;
        client.join(name);
      }
    },

    openOnetoone: function(user_id) {

    },

    // FOCUS TAB/PANEL MANAGEMENT
    // ======================================================================

    onFocusHome: function() {
      this.$discussionsPanelsContainer.find('#home').show();
    },
    onUnfocusHome: function() {
      this.$discussionsPanelsContainer.find('#home').hide();
    }

  });

  return new MainView();
});