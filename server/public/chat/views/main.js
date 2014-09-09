define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'views/window',
  'views/current-user',
  'views/alert',
  'views/home',
  'views/drawer',
  'views/drawer-room-create',
  'views/drawer-room-profile',
  'views/drawer-room-edit',
  'views/drawer-user-profile',
  'views/drawer-user-edit',
  'views/drawer-user-account',
  'views/room',
  'views/onetoone',
  'views/room-block',
  'views/onetoone-block'
], function ($, _, Backbone, client, rooms, onetoones, currentUser, windowView,
             CurrentUserView, AlertView, HomeView,
             DrawerView,
             DrawerRoomCreateView, DrawerRoomProfileView, DrawerRoomEditView,
             DrawerUserProfileView, DrawerUserEditView, DrawerUserAccountView,
             RoomView, OneToOneView,
             RoomBlockView, OnetooneBlockView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $account: $('#account'),

    $discussionsPanelsContainer: $("#center"),

    thisDiscussionShouldBeFocusedOnSuccess: '',

    defaultColor: '#fc2063', // @todo : put this value somewhere in DOM, modifiable by users

    currentColor: '',

    events: {
      'click #create-room-link':          'openCreateRoom',
      'click .open-user-edit':            'openUserEdit',
      'click .open-user-account':         'openUserAccount',
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
      this.listenTo(rooms, 'kicked', this.roomKicked); // @todo: nasty event

      // generate and attach subviews
      this.currentUserView = new CurrentUserView({model: currentUser});
      this.roomBlockView = new RoomBlockView({collection: rooms});
      this.onetooneBlockView = new OnetooneBlockView({collection: onetoones});
      this.homeView = new HomeView({});
      this.drawerView = new DrawerView({mainView: this});
      this.alertView = new AlertView({mainView: this});

      window.rooms = rooms; // @debug
      window.onetoones = onetoones; // @debug
    },

    alert: function(type, message) {
      type = type || 'info';
      this.alertView.show(type, message);
    },

    _color: function(color) {
      this.$el.find('#color').css('background-color', color);
    },

    color: function(color, temporary, reset) {
      if (reset)
        return this._color(this.currentColor);

      color = color || this.defaultColor;

      if (!temporary)
        this.currentColor = color;

      return this._color(color);
    },

    _handleAction: function(event) {
      if (!event) return false;
      event.preventDefault();
      event.stopPropagation();
    },

    /**
     * Executed each time the connexion with server is re-up (can occurs multiple
     * time in a same session)
     * @param data
     */
    onWelcome: function(data) {
      // Hello
      if (data.hello){
        this.currentUserView.hello = data.hello;
        this.currentUserView.render();
      }

      // Run routing only when everything in interface is ready
      this.trigger('ready');
    },

    /**
     * Trigger when currentUser is kicked from a room to handle focus and
     * notification
     * @param event
     * @returns {boolean}
     */
     roomKicked: function(data) {
      this.focusHome();
      var message = $.t("chat.kickmessage")+data.name;
      if (data.reason)
        message += ' (reason: '+data.reason+')';
      this.alert('warning', message);
    },

    // DRAWERS
    // ======================================================================

    openCreateRoom: function(event) {
      this._handleAction(event);

      var view = new DrawerRoomCreateView({ mainView: this });
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openUserAccount: function(event) {
      this._handleAction(event);

      var view = new DrawerUserAccountView({ mainView: this });
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openUserProfile: function(event) {
      this._handleAction(event);

      var username = $(event.currentTarget).data('username');
      if (!username)
        return;

      var view = new DrawerUserProfileView({ mainView: this, username: username });
      this.drawerView.setSize('280px').setView(view).open();

      return false; // stop propagation
    },
    openRoomProfile: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomProfileView({ mainView: this, name: name });
      this.drawerView.setSize('280px').setView(view).open();

      return false; // stop propagation
    },
    openRoomEdit: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomEditView({ mainView: this, name: name });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },
    openUserEdit: function(event) {
      this._handleAction(event);

      var view = new DrawerUserEditView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    addRoomView: function(model, collection, options) {
      var view = new RoomView({
        collection: collection,
        model:      model,
        mainView:   this
      });
      this.$discussionsPanelsContainer.append(view.$el);

      if (this.thisDiscussionShouldBeFocusedOnSuccess == model.get('name')) {
        this.focus(model);
      }
    },

    addOneView: function(model, collection, options) {
      var view = new OneToOneView({
        collection: collection,
        model:      model,
        mainView:   this
      });
      this.$discussionsPanelsContainer.append(view.$el);
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

      var focused = model.get('focused');

      // Remove entity (on remove: panel will autodestroy and model will client.leave)
      rooms.remove(model);

      // Focus default
      if (focused)
        this.focusHome();
    },

    closeOne: function(username) {
      var model = onetoones.findWhere({ username: username });
      if (model == undefined) return;

      var focused = model.get('focused');

      // Remove entity (on remove: panel will autodestroy and model will client.close)
      onetoones.remove(model);

      // Focus default
      if (focused)
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
      // @todo : change pattern to render page with spinner and replace content on callback
      client.home(); // render home by asking data to server
      this.unfocusAll();
      this.$home.show();
      windowView.setTitle();
      this.roomBlockView.render();
      this.onetooneBlockView.render();
      this.color(this.defaultColor);
      Backbone.history.navigate('#'); // just change URI, not run route action
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
      // @todo : we can have additionnal data (avatar, user_id ...) depending of call context (user profile)
      var model = onetoones.getModel({ username: username });
      return this.focus(model);
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
      if (model.get('type') == 'onetoone' && model.get('username') != undefined)
        client.userStatus(model.get('username'));

      // Focus the one we want
      model.set('focused', true);
      model.set('unread', 0);
      this.roomBlockView.render();
      this.onetooneBlockView.render();

      // Change interface color
      if (model.get('color'))
        this.color(model.get('color'));
      else
        this.color(this.defaultColor);

      // Update URL (always!) and page title
      var uri;
      var title;
      if (model.get('type') == 'room') {
        uri = 'room/'+model.get('name').replace('#', '');
        title = model.get('name');
      } else {
        uri = 'user/'+model.get('username');
        title = model.get('username');
      }
      windowView.setTitle(title);
      Backbone.history.navigate(uri); // just change URI, not run route action

      this.drawerView.close();
    }

  });

  return new MainView();
});