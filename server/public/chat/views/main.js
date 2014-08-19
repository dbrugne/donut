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
  'views/room',
  'views/onetoone-panel',
  'views/room-block',
  'views/onetoone-block'
], function ($, _, Backbone, client, rooms, onetoones, currentUser, windowView,
             CurrentUserView, AlertView, HomeView,
             DrawerView,
             DrawerRoomCreateView, DrawerRoomProfileView, DrawerRoomEditView,
             DrawerUserProfileView, DrawerUserEditView,
             RoomView, OneToOnePanelView,
             RoomBlockView, OnetooneBlockView) {

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $account: $('#account'),

    $discussionsPanelsContainer: $("#center"),

    thisDiscussionShouldBeFocusedOnSuccess: '',

    events: {
      'click #create-room-link':          'openCreateRoom',
      'click .open-user-edit':            'openUserEdit',
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
    },

    alert: function(type, message) {
      type = type || 'info';
      this.alertView.show(type, message);
    },

    defaultColor: '#fc2063', // @todo : put this value somewhere in DOM, modifiable by users

    currentColor: '',

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

      var message = 'You were kicked from '+data.name;
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
    openUserProfile: function(event) {
      this._handleAction(event);

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var view = new DrawerUserProfileView({ mainView: this, userId: userId });
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
      var view = new OneToOnePanelView({
        collection: collection,
        model:      model,
        mainView:   this
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
      // @todo : change pattern to render page with spinner and replace content
      // on callback
      client.home(); // render home by asking data to server
      this.unfocusAll();
      this.$home.show();
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

      // Change interface color
      if (model.get('type') == 'room')
        this.color(model.get('color'))
      else
        this.color('#FF00AA')

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