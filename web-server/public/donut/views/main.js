define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'models/app',
  'client',
  'models/current-user',
  'models/event',
  'collections/rooms',
  'collections/onetoones',
  '_templates',
  'views/window',
  'views/modal-connection',
  'views/modal-welcome',
  'views/current-user',
  'views/alert',
  'views/home',
  'views/drawer',
  'views/drawer-room-create',
  'views/drawer-room-profile',
  'views/drawer-room-edit',
  'views/drawer-room-users',
  'views/drawer-room-preferences',
  'views/drawer-room-delete',
  'views/drawer-user-profile',
  'views/drawer-user-edit',
  'views/drawer-user-preferences',
  'views/drawer-account',
  'views/discussion-room',
  'views/discussion-onetoone',
  'views/discussions-block',
  'views/notifications',
  'views/modal-confirmation',
  'views/modal-room-users',
  'views/mute'
], function ($, _, Backbone, donutDebug, app, client, currentUser, EventModel, rooms, onetoones, templates, windowView,
             ConnectionModalView, WelcomeModalView,
             CurrentUserView, AlertView, HomeView,
             DrawerView,
             DrawerRoomCreateView, DrawerRoomProfileView, DrawerRoomEditView, DrawerRoomUsersView, DrawerRoomPreferencesView,
             DrawerRoomDeleteView,
             DrawerUserProfileView, DrawerUserEditView, DrawerUserPreferencesView, DrawerUserAccountView,
             RoomView, OneToOneView,
             DiscussionsBlockView, NotificationsView, ConfirmationView, RoomUsersModalView, MuteView) {

  var debug = donutDebug('donut:main');

  var MainView = Backbone.View.extend({

    el: $("#chat"),

    $home: $('#home'),

    $discussionsPanelsContainer: $("#center"),

    firstConnection: true,

    thisDiscussionShouldBeFocusedOnSuccess: '',

    defaultColor: '',

    currentColor: '',

    views: {},

    interval: null,

    intervalDuration: 240000, // ms

    events: {
      'click .go-to-search'             : 'focusOnSearch',
      'click .open-create-room'         : 'openCreateRoom',
      'click .open-user-edit'           : 'openUserEdit',
      'click .open-user-preferences'    : 'openUserPreferences',
      'click .open-user-account'        : 'openUserAccount',
      'click .open-user-profile'        : 'onOpenUserProfile',
      'click .action-user-ban'          : 'userBan',
      'click .action-user-deban'        : 'userDeban',
      'dblclick .dbl-open-user-profile' : 'onOpenUserProfile',
      'click .open-room-profile'        : 'onOpenRoomProfile',
      'click .open-room-edit'           : 'openRoomEdit',
      'click .open-room-preferences'    : 'openRoomPreferences',
      'click .open-room-users'          : 'openRoomUsers',
      'click .open-room-delete'         : 'openRoomDelete',
      'click .close-discussion'         : 'onCloseDiscussion'
    },

    initialize: function() {
      this.defaultColor = window.room_default_color;

      this.listenTo(client,      'welcome', this.onWelcome);
      this.listenTo(client,      'disconnect', this.onDisconnect);
      this.listenTo(client,      'reconnect', this.onReconnect);
      this.listenTo(rooms,       'add', this.addView);
      this.listenTo(rooms,       'remove', this.onRemoveDiscussion);
      this.listenTo(onetoones,   'add', this.addView);
      this.listenTo(onetoones,   'remove', this.onRemoveDiscussion);
      this.listenTo(rooms,       'kickedOrBanned', this.roomKickedOrBanned);
      this.listenTo(rooms,       'deleted', this.roomRoomDeleted);
      this.listenTo(app,         'openRoomProfile', this.openRoomProfile);
      this.listenTo(app,         'openUserProfile', this.openUserProfile);
      this.listenTo(app,         'joinRoom', this.focusRoomByName);


    },
    run: function() {
      // generate and attach subviews
      this.currentUserView = new CurrentUserView({model: currentUser});
      this.discussionsBlock = new DiscussionsBlockView({mainView: this});
      this.drawerView = new DrawerView({mainView: this});
      this.alertView = new AlertView({mainView: this});
      this.connectionView = new ConnectionModalView({mainView: this});
      this.welcomeView = new WelcomeModalView({mainView: this});
      this.notificationsView = new NotificationsView({mainView: this});
      this.muteView = new MuteView({mainView: this});
      this.roomUsersView = new RoomUsersModalView();

      // @debug
      window.current = currentUser;
      window.rooms = rooms;
      window.onetoones = onetoones;
    },

    /**
     * Executed each time the connexion with server is re-up (can occurs multiple
     * time in a same session)
     * @param data
     */
    onWelcome: function(data) {
      debug.start('welcome');
      debug.start('welcome-before');
      var that = this;

      // Current user data (should be done before onetoone logic)
      currentUser.set(data.user, {silent: true});
      currentUser.setPreferences(data.preferences, {silent: true});
      this.currentUserView.render();
      this.muteView.render();

      // Only on first connection
      if (this.firstConnection) { // show if true or if undefined
        // Welcome message
        if (currentUser.shouldDisplayWelcome()) {
          this.welcomeView.render(data);
          this.welcomeView.show();
        }

        // Elements hidden until first 'welcome'
        $('#block-discussions').show();
      }

      debug.end('welcome-before');

      // Rooms
      debug.start('welcome-rooms');
      _.each(data.rooms, function(room) {
        debug.start('welcome-'+room.name);
        rooms.addModel(room);
        debug.end('welcome-'+room.name);
      });
      debug.end('welcome-rooms');

      // One to ones
      debug.start('welcome-ones');
      _.each(data.onetoones, function(one) {
        onetoones.addModel(one);
      });
      debug.end('welcome-ones');

      this.discussionsBlock.redraw();

      // Notifications
      if (data.notifications)
        this.notificationsView.initializeNotificationState(data.notifications);

      this.firstConnection = false;

      // set intervaller (set on 'connection')
      this.interval = setTimeout(function() {
        that.updateViews();
      }, this.intervalDuration);

      // Run routing only when everything in interface is ready
      this.trigger('ready');
      this.connectionView.hide();
      debug.end('welcome');
    },
    onDisconnect: function() {
      // disable interval
      clearInterval(this.interval);

      // add disconnected event in each discussion
      var e = new EventModel({
        type: 'disconnected'
      });
      _.each(this.views, function(view) {
        view.eventsView.addFreshEvent(e);
        view.hasBeenFocused = false; // will force re-fetch data on next focus
      });
    },
    onReconnect: function() {
      // add reconnected event in each discussion
      var e = new EventModel({
        type: 'reconnected'
      });
      _.each(this.views, function(view) {
        view.eventsView.addFreshEvent(e);
      });
    },

    alert: function(type, message) {
      type = type || 'info';
      this.alertView.show(type, message);
    },

    _color: function(color) {
      $('body').removeClass (function (index, css) {
        return (css.match (/(dc-\S+)+/g) || []).join(' ');
      }).addClass('dc-'+color.replace('#', '').toLowerCase());
    },

    color: function(color, temporary, reset) {
      if (reset)
        return this._color(this.currentColor);

      color = color || this.defaultColor;

      if (!temporary)
        this.currentColor = color;

      return this._color(color);
    },

    viewportIs: function (expression) {
      var pattern = /^(<|>|=)(xs|sm|md|lg)$/;
      if (!pattern.test(expression))
        return;

      var matches = expression.match(pattern);
      if (!matches || !matches[1] || !matches[2])
        return;

      var $root = $('body > .responsive');
      if (!$root || !$root.length)
        return;
      var breakpoints = {
        xs: $root.find('.device-xs').is(':visible'),
        sm: $root.find('.device-sm').is(':visible'),
        md: $root.find('.device-md').is(':visible'),
        lg: $root.find('.device-lg').is(':visible')
      };

      var compare = matches[1];
      var breakpoint = matches[2];

      if (compare === '=') {
        return breakpoints[breakpoint];
      }

      if (compare === '>') {
        if (breakpoint === 'xs')
          return ((breakpoints['sm'] || breakpoints['md'] || breakpoints['lg']) && !breakpoints['xs']);
        else if (breakpoint === 'sm')
          return ((breakpoints['md'] || breakpoints['lg']) && !breakpoints['sm']);
        else if (breakpoint === 'md')
          return (breakpoints['lg'] && !breakpoints['md']);
        else
          return false;
      } else if (compare === '<') {
        if (breakpoint === 'lg')
          return ((breakpoints['md'] || breakpoints['sm'] || breakpoints['xs']) && !breakpoints['lg']);
        else if (breakpoint === 'md')
          return ((breakpoints['sm'] || breakpoints['xs']) && !breakpoints['md']);
        else if (breakpoint === 'sm')
          return (breakpoints['xs'] && !breakpoints['sm']);
        else
          return false;
      }
    },

    _handleAction: function(event) {
      if (!event) return false;
      event.preventDefault();
      event.stopPropagation();
    },

    /**
     * Trigger when currentUser is kicked or banned from a room to handle focus and
     * notification
     * @param event
     * @returns {boolean}
     */
    roomKickedOrBanned: function(event) {
      var what = event.what;
      var data = event.data;
      this.focus();
      var message = (what == 'kick') ? $.t("chat.kickmessage", {name: data.name}) : $.t("chat.banmessage", {name: data.name});
      if (data.reason)
        message += ' ' + $.t("chat.reason", {reason: _.escape(data.reason)});
      this.alert('warning', message);
    },
    roomRoomDeleted: function(data) {
      this.focus();
      if (data && data.reason)
        this.alert('warning', data.reason);
    },

    // DRAWERS
    // ======================================================================

    openCreateRoom: function(event) {
      event.preventDefault();
      var name = $(event.currentTarget).data('name') || '';
      var view = new DrawerRoomCreateView({ mainView: this, name: name });
      this.drawerView.setSize('450px').setView(view).open();
    },
    openUserAccount: function(event) {
      event.preventDefault();
      var view = new DrawerUserAccountView({ mainView: this });
      this.drawerView.setSize('320px').setView(view).open();
    },
    onOpenUserProfile: function(event) {
      event.preventDefault();

      var userId = $(event.currentTarget).data('userId');
      if (!userId)
        return;

      var view = new DrawerUserProfileView({ mainView: this, user_id: userId });
      this.drawerView.setSize('380px').setView(view).open();
    },
    openUserProfile: function(data) {
      var view = new DrawerUserProfileView({ mainView: this, data: data });
      this.drawerView.setSize('380px').setView(view).open();
    },
    onOpenRoomProfile: function(event) {
      event.preventDefault();

      var roomId = $(event.currentTarget).data('roomId');
      if (!roomId)
        return;

      var view = new DrawerRoomProfileView({ mainView: this, room_id: roomId });
      this.drawerView.setSize('380px').setView(view).open();
    },
    openRoomProfile: function(data) {
      var view = new DrawerRoomProfileView({ mainView: this, data: data });
      this.drawerView.setSize('380px').setView(view).open();
    },
    openRoomEdit: function(event) {
      event.preventDefault();

      var roomId = $(event.currentTarget).data('roomId');
      if (!roomId)
        return;

      var view = new DrawerRoomEditView({ mainView: this, name: name , room_id: roomId});
      this.drawerView.setSize('450px').setView(view).open();
    },
    openRoomUsers: function(event) {
      event.preventDefault();

      var roomId = $(event.currentTarget).data('roomId');
      if (!roomId)
        return;

      var model = rooms.get(roomId);
      if (!model)
        return;

      if (this.viewportIs('>md')) {
        // drawer
        var view = new DrawerRoomUsersView({ mainView: this, model: model });
        this.drawerView.setSize('450px').setView(view).open();
      } else {
        // modal
        this.roomUsersView.show(model);
      }
    },
    openRoomPreferences: function(event) {
      event.preventDefault();

      var roomId = $(event.currentTarget).data('roomId');
      if (!roomId)
        return;

      var model = rooms.get(roomId);
      if (!model)
        return;

      var view = new DrawerRoomPreferencesView({ mainView: this, model: model });
      this.drawerView.setSize('450px').setView(view).open();
    },
    openRoomDelete: function(event) {
      event.preventDefault();
      var roomId = $(event.currentTarget).data('roomId');
      if (!roomId)
        return;

      var view = new DrawerRoomDeleteView({ mainView: this, room_id: roomId });
      this.drawerView.setSize('450px').setView(view).open();
    },
    openUserEdit: function(event) {
      event.preventDefault();
      var view = new DrawerUserEditView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();
    },
    openUserPreferences: function(event) {
      event.preventDefault();
      var view = new DrawerUserPreferencesView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();
    },

    // DISCUSSIONS MANAGEMENT
    // ======================================================================

    addView: function(model, collection, options) {
      var constructor = (model.get('type') == 'room') ? RoomView : OneToOneView;

      // create view
      var view = new constructor({
        collection: collection,
        model:      model,
        mainView:   this
      });

      // add to views list
      this.views[model.get('id')] = view;

      // append to DOM
      this.$discussionsPanelsContainer.append(view.$el);

      var identifier = (model.get('type') == 'room') ? model.get('name') : model.get('username');
      if (this.thisDiscussionShouldBeFocusedOnSuccess == identifier) {
        this.focus(model);
        this.thisDiscussionShouldBeFocusedOnSuccess = null;
      }

      this.discussionsBlock.redraw();
    },

    onCloseDiscussion: function(event) {
      this._handleAction(event);

      var $target = $(event.currentTarget);
      if (!$target)
        return;

      var type = $target.data('type');
      var identifier = $target.data('identifier');
      var model;
      if (type == 'room') {
        model = rooms.findWhere({ name: identifier });
      } else {
        model = onetoones.findWhere({ username: ''+identifier }); // force string to handle fully numeric username
      }

      if (model == undefined)
        return debug('close discussion error: unable to find model');

      model.leave(); // trigger a server back and forth, *:leave will remove view from interface

      return false; // stop propagation
    },
    onRemoveDiscussion: function(model, collection, options) {
      var view = this.views[model.get('id')];
      if (view === undefined)
        return debug('close discussion error: unable to find view');

      var wasFocused = model.get('focused');

      view.removeView();
      delete this.views[model.get('id')];

      this.persistPositions(true); // warning, this call (will trigger broadcast to all user sockets) could generate weird behavior on discussion block on multi-devices

      // Focus default
      if (wasFocused)
        this.focusHome();
      else
        this.discussionsBlock.redraw();
    },

    persistPositions: function(silent) {
      silent = silent | false;

      var positions = [];
      this.discussionsBlock.$list.find('a.item').each(function() {
        var identifier = ''+$(this).data('identifier'); // force string to handle fully numeric username
        if (identifier)
          positions.push(identifier);
      });

      currentUser.set({positions: positions}, {silent: silent});
      client.userUpdate({positions: positions}, function(data) {
        if (data.err)
          debug('error(s) on userUpdate call', data.errors);
      });
    },

    updateViews: function() {
      // call update() method on each view
      _.each(this.views, function(view) {
        debug('update on '+view.model.get('id'));
        view.update();
      });

      // set next tick
      var that = this;
      this.interval = setTimeout(function() {
        that.updateViews();
      }, this.intervalDuration);
    },

    // FOCUS TAB/PANEL MANAGEMENT
    // ======================================================================

    focusOnSearch: function(event) {
      this.focusHome(true);
      this.homeView.searchView.$search
          .focus();
      this.drawerView.close();
    },

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
    focusHome: function(avoidReload) {
      // init view
      if (!this.homeView)
        this.homeView = new HomeView({});

      if (avoidReload !== true)
        client.home();

      this.unfocusAll();
      this.$home.show();
      windowView.setTitle();
      this.discussionsBlock.redraw();
      this.color(this.defaultColor);
      Backbone.history.navigate('#'); // just change URI, not run route action
    },

    focusRoomByName: function(name) {
      var model = rooms.iwhere('name', name);
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = name;
        var that = this;
        client.roomJoin(null, name, function(response) {
          if (response.err == 'banned') {
            that.alert('error', $.t('chat.bannedfromroom', {name: name}));
            that.focus();
          } else if (response.err == 'notexists') {
            that.alert('error', $.t('chat.roomnotexists', {name: name}));
            that.focus();
          } else if (response.err) {
            that.alert('error', $.t('global.unknownerror'));
            that.focus();
          }
        });
      } else {
        this.focus(model);
      }
    },

    // called by router only
    focusOneToOneByUsername: function (username) {
      var model = onetoones.iwhere('username', username);
      if (model === undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = username;
        onetoones.join(username);
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
      this.discussionsBlock.redraw();

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
    },

    userBan: function (event) {
      event.preventDefault();

      var userId = $(event.currentTarget).data('userId');
      if (!userId) {
        return;
      }

      var that = this;
      ConfirmationView.open({}, function () {
        client.userBan(userId, null);
        that.trigger('userBan');
      });
    },

    userDeban: function (event) {
      event.preventDefault();

      var userId = $(event.currentTarget).data('userId');
      if (!userId) {
        return;
      }
      var that = this;
      ConfirmationView.open({}, function() {
        client.userDeban(userId);
        that.trigger('userDeban');
      });

    }
  });

  return new MainView();
});