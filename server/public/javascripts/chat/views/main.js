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
  'views/room-create',
  'views/room-search',
  'views/user-search',
  'views/room-panel',
  'views/onetoone-panel',
  'views/room-block',
  'views/onetoone-block',
  'views/account',
  'views/room-edit',
  'views/user-profile', // need to be loaded here to instantiate DOM
  'views/room-profile' // idem
], function ($, _, Backbone, client, rooms, onetoones, currentUser, windowView,
             statusView, alertView, homeView, RoomCreateView,
             RoomSearchView, UserSearchView, RoomPanelView, OneToOnePanelView,
             RoomBlockView, OnetooneBlockView, AccountView, RoomEditView, UserProfileView, RoomProfileView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $search: $('#search'),

    $discussionsPanelsContainer: $("#chat-center"),

    thisDiscussionShouldBeFocusedOnSuccess: '',

    events: {
      'click #search-room-link':          'openSearchRoomModal',
      'click #create-room-link':          'openCreateRoomModal',
      'click #search-user-link':          'openSearchUserModal',
      'click .open-user-profile':         'openUserProfile',
      'dblclick .dbl-open-user-profile':  'openUserProfile',
      'click .open-room-profile':         'openRoomProfile',
      'click .open-room-edit':            'openRoomEdit',
      'click .close-room':                'onCloseDiscussion',
      'click .close-onetoone':            'onCloseDiscussion'
    },

    initialize: function() {
      this.listenTo(client, 'welcome', this.onWelcome);
      this.listenTo(rooms, 'add', this.addRoomView);
      this.listenTo(onetoones, 'add', this.addOneView);

      var that = this;
      $('#youraccount').click(this, function(event) {
        that.openAccount(event);
      }); // link is outside div#chat

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
      if (!event) return false;
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

      // Join #General
      client.join('#General'); // @todo : should be called on collection

      // Join rooms
      _.each(data.rooms, function(room) {
        rooms.addModel(room);
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

    openSearchRoomModal: function(event) {
      if (!this.searchRoomModal) {
        this.searchRoomModal = new RoomSearchView({mainView: this});
        this.searchRoomModal.search();
      }
      this.searchRoomModal.show();
    },
    openCreateRoomModal: function(event) {
      if (!this.createRoomModal) {
        this.createRoomModal = new RoomCreateView({mainView: this});
      }
      this.createRoomModal.show();
    },
    openSearchUserModal: function(event) {
      if (!this.userSearchModal) {
        this.userSearchModal = new UserSearchView({mainView: this});
        this.userSearchModal.search();
      }
      this.userSearchModal.show();
    },
    openUserProfile: function(event) {
      this._handleAction(event);

      if (!this.userProfileModal) {
        this.userProfileModal = new UserProfileView({ mainView: this });
      }

      var userId = $(event.currentTarget).data('userId');
      if (userId)
        client.userProfile(userId);

      return false; // stop propagation
    },
    openRoomProfile: function(event) {
      this._handleAction(event);

      if (!this.roomProfileModal) {
        this.roomProfileModal = new RoomProfileView({ mainView: this });
      }

      var roomName = $(event.currentTarget).data('roomName');
      if (roomName)
        client.roomProfile(roomName);

      return false; // stop propagation
    },
    openAccount: function(event) {
      this._handleAction(event);

      if (!this.accountModal) {
        this.accountModal = new AccountView({ mainView: this });
      }

      this.accountModal.iframeRender();
      this.accountModal.show();

      return false; // stop propagation
    },
    openRoomEdit: function(event) {
      this._handleAction(event);

      if (!this.roomEditModal) {
        this.roomEditModal = new RoomEditView({ mainView: this });
      }

      var roomName = $(event.currentTarget).data('roomName');

      if (!roomName)
        return;

      this.roomEditModal.setUrl(roomName);
      this.roomEditModal.iframeRender();
      this.roomEditModal.show();

      return false; // stop propagation
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    addRoomView: function(model, collection, options) {
      var view = new RoomPanelView({
        collection: collection,
        model:      model
      });
      this.$discussionsPanelsContainer.append(view.$el);

      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('name')) {
        this.focus(model);
      }
    },

    addOneView: function(model, collection, options) {
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
      this.$search.hide();
    },

    // called by router only
    focusHome: function() {
      client.home(); // render home by asking data to server
      this.unfocusAll();
      this.$home.show();
      this.roomBlockView.render();
      this.onetooneBlockView.render();
      Backbone.history.navigate('#'); // just change URI, not run route action
    },

    focusSearch: function() {
      this.unfocusAll();
      this.$search.show();
      Backbone.history.navigate('#search'); // just change URI, not run route action
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

      // Onetoone particular case, we check for user status
      if (model.get('type') == 'onetoone')
        client.userStatus(model.get('username'));

      // Focus the one we want
      model.set('focused', true);
      model.set('unread', 0);
      this.roomBlockView.render();
      this.onetooneBlockView.render();

      // Update URL (always!)
      var uri;
      if (model.get('type') == 'room') {
        uri = 'room/'+model.get('name').replace('#', '');
      } else {
        uri = 'user/'+model.get('username');
      }
      Backbone.history.navigate(uri); // just change URI, not run route action
    }

  });

  return new MainView();
});