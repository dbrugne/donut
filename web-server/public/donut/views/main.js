define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'models/event',
  'collections/rooms',
  'collections/onetoones',
  '_templates',
  'views/window',
  'views/modal-connection',
  'views/modal-welcome',
  'views/modal-confirmation',
  'views/current-user',
  'views/alert',
  'views/home',
  'views/quick-search',
  'views/drawer',
  'views/drawer-room-create',
  'views/drawer-room-profile',
  'views/drawer-room-edit',
  'views/drawer-room-users',
  'views/drawer-room-delete',
  'views/drawer-user-profile',
  'views/drawer-user-edit',
  'views/drawer-user-account',
  'views/discussion-room',
  'views/discussion-onetoone',
  'views/discussions-block'
], function ($, _, Backbone, client, currentUser, EventModel, rooms, onetoones, templates, windowView,
             ConnectionModalView, welcomeModalView, confirmationModalView,
             CurrentUserView, AlertView, HomeView, QuickSearchView,
             DrawerView,
             DrawerRoomCreateView, DrawerRoomProfileView, DrawerRoomEditView, DrawerRoomUsersView,
             DrawerRoomDeleteView,
             DrawerUserProfileView, DrawerUserEditView, DrawerUserAccountView,
             RoomView, OneToOneView,
             DiscussionsBlockView) {

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
      'click .open-user-account'        : 'openUserAccount',
      'click .open-user-profile'        : 'openUserProfile',
      'dblclick .dbl-open-user-profile' : 'openUserProfile',
      'click .open-room-profile'        : 'openRoomProfile',
      'click .open-room-edit'           : 'openRoomEdit',
      'click .open-room-delete'         : 'openRoomDelete',
      'click .close-discussion'         : 'onCloseDiscussion',
      'mouseenter *[data-toggle="image-popover"]': 'onEnterImage',
      'mouseleave *[data-toggle="image-popover"]': 'onLeaveImage'
    },

    initialize: function() {
      this.defaultColor = window.room_default_color;

      this.listenTo(client,     'welcome', this.onWelcome);
      this.listenTo(client,     'disconnect', this.onDisconnect);
      this.listenTo(client,     'reconnect', this.onReconnect);
      this.listenTo(rooms,      'add', this.addView);
      this.listenTo(rooms,      'remove', this.onRemoveDiscussion);
      this.listenTo(onetoones,  'add', this.addView);
      this.listenTo(onetoones,  'remove', this.onRemoveDiscussion);
      this.listenTo(rooms,      'kickedOrBanned', this.roomKickedOrBanned);
      this.listenTo(rooms,      'deleted', this.roomRoomDeleted);
    },
    run: function() {
      // generate and attach subviews
      this.currentUserView = new CurrentUserView({model: currentUser});
      this.discussionsBlock = new DiscussionsBlockView({mainView: this});
      this.drawerView = new DrawerView({mainView: this});
      this.alertView = new AlertView({mainView: this});
      this.connectionView = new ConnectionModalView({mainView: this});

      // @todo : reuse for top navbar
//      this.quickSearchView = new QuickSearchView({
//        el: this.$el.find('#block-search'),
//        mainView: this
//      });

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
      window.debug.start('welcome');
      window.debug.start('welcome-before');
      var that = this;

      // Only on first connection
      if (this.firstConnection) { // show if true or if undefined
        // Welcome message
        if (data.user.welcome !== false) {
          welcomeModalView.render(data.welcome);
          welcomeModalView.show();
        }

        // Elements hidden until first 'welcome'
        $('#block-discussions, #block-actions').show();
      }

      // Current user data (should be done before onetoone logic)
      if (data.hello)
        this.currentUserView.hello = data.hello;
      currentUser.set(data.user, {silent: true});
      this.currentUserView.render();

      window.debug.end('welcome-before');

      // Rooms
      window.debug.start('welcome-rooms');
      _.each(data.rooms, function(room) {
        window.debug.start('welcome-'+room.name);
        rooms.addModel(room);
        window.debug.end('welcome-'+room.name);
      });
      window.debug.end('welcome-rooms');

      // One to ones
      window.debug.start('welcome-ones');
      _.each(data.onetoones, function(one) {
        onetoones.addModel(one);
      });
      window.debug.end('welcome-ones');

      this.discussionsBlock.redraw();

      this.firstConnection = false;

      // set intervaller (set on 'connection')
      this.interval = setTimeout(function() {
        that.updateViews();
      }, this.intervalDuration);

      // Run routing only when everything in interface is ready
      this.trigger('ready');
      this.connectionView.hide();
      window.debug.end('welcome');
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
    onEnterImage: function(event) {
      event.preventDefault();
      var $image = $(event.currentTarget);
      var cloudinaryId = $image.attr('data-cloudinary-id');
      var url = $.cd.natural(cloudinaryId, 150, 150);
      $image.popover({
        animation: false,
        content: '<img src="'+url+'" alt="user contribution">',
        html: true,
        placement: 'auto left',
        viewport: $image.closest('div.mCSB_container')
      });

      $image.on('shown.bs.popover', function () {
        var $i = $('.popover-content img');
        $i.bind('load', function() {
          if ($image.data('imgloaded'))
            return;

          $image.data('imgloaded', true);
          $image.popover('show');
        });
      });

      $image.popover('show');
    },
    onLeaveImage: function(event) {
      $image = $(event.currentTarget);
      $image.popover('hide');
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
        message += ' ' + $.t("chat.reason", {reason: data.reason});
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
      this._handleAction(event);

      var view = new DrawerRoomCreateView({ mainView: this });
      this.drawerView.setSize('450px').setView(view).open();

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
      this.drawerView.setSize('320px').setView(view).open();

      return false; // stop propagation
    },
    openRoomProfile: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomProfileView({ mainView: this, name: name });
      this.drawerView.setSize('320px').setView(view).open();

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
    openRoomUsers: function(model) {
      var view = new DrawerRoomUsersView({ mainView: this, model: model });
      this.drawerView.setSize('450px').setView(view).open();

      return false; // stop propagation
    },
    openRoomDelete: function(event) {
      this._handleAction(event);

      var name = $(event.currentTarget).data('roomName');
      if (!name)
        return;

      var view = new DrawerRoomDeleteView({ mainView: this, name: name });
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

      var $target = $(event.currentTarget).closest('a.item').first();
      if (!$target)
        return;

      var type = $target.data('type');
      var identifier = $target.data('identifier');
      var collection, model;
      if (type == 'room') {
        collection = rooms;
        model = rooms.findWhere({ name: identifier });
      } else {
        collection = onetoones;
        model = onetoones.findWhere({ username: identifier });
      }

      if (model == undefined)
        return window.debug.log('close discussion error: unable to find model');


      model.leave(); // trigger a server back and forth, *:leave will remove view from interface

      return false; // stop propagation
    },
    onRemoveDiscussion: function(model, collection, options) {
      var view = this.views[model.get('id')];
      if (view === undefined)
        return window.debug.log('close discussion error: unable to find view');

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
        var identifier = $(this).data('identifier');
        if (identifier)
          positions.push(identifier);
      });

      currentUser.set({positions: positions}, {silent: silent});
      client.userUpdate({positions: positions}, function(data) {
        if (data.err)
          window.debug.log('error(s) on userUpdate call', data.errors);
      });
    },

    updateViews: function() {
      // call update() method on each view
      _.each(this.views, function(view) {
        window.debug.log('update on '+view.model.get('id'));
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

      // @todo : change pattern to render page with spinner and replace content on callback
      if (avoidReload !== true)
        client.home();

      this.unfocusAll();
      this.$home.show();
      windowView.setTitle();
      this.discussionsBlock.redraw();
      this.color(this.defaultColor);
      Backbone.history.navigate('#'); // just change URI, not run route action
    },

    // called by router only
    focusRoomByName: function(name) {
      var model = rooms.iwhere('name', name);
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = name;
        var that = this;
        client.roomJoin(name, function(err) {
          if (err) {
            that.alert('error', $.t('chat.bannedfromroom', {name: name}));
            that.focus();
          }
        });
      } else {
        this.focus(model);
      }
    },

    // called by router only
    focusOneToOneByUsername: function(username) {
      var model = onetoones.iwhere('username', username);
      if (model == undefined) {
        // Not already open
        this.thisDiscussionShouldBeFocusedOnSuccess = username;
        onetoones.join(username);
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
      model.set('unread', 0);
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
    }

  });

  return new MainView();
});