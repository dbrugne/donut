var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var donutDebug = require('../libs/donut-debug');
var app = require('../models/app');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var windowView = require('./window');
var ConnectionModalView = require('./modal-connection');
var WelcomeModalView = require('./modal-welcome');
var CurrentUserView = require('./current-user');
var AlertView = require('./alert');
var HomeView = require('./home');
var DrawerView = require('./drawer');
var DrawerRoomAccessView = require('./drawer-room-access');
var DrawerRoomCreateView = require('./drawer-room-create');
var DrawerRoomProfileView = require('./drawer-room-profile');
var DrawerRoomEditView = require('./drawer-room-edit');
var DrawerRoomUsersView = require('./drawer-room-users');
var DrawerRoomPreferencesView = require('./drawer-room-preferences');
var DrawerRoomDeleteView = require('./drawer-room-delete');
var DrawerUserProfileView = require('./drawer-user-profile');
var DrawerUserEditView = require('./drawer-user-edit');
var DrawerUserPreferencesView = require('./drawer-user-preferences');
var DrawerUserAccountView = require('./drawer-account');
var RoomView = require('./discussion-room');
var RoomViewBlocked = require('./discussion-room-blocked');
var OneToOneView = require('./discussion-onetoone');
var DiscussionsBlockView = require('./discussions-block');
var NotificationsView = require('./notifications');
var ConfirmationView = require('./modal-confirmation');
var MuteView = require('./mute');

var debug = donutDebug('donut:main');

var MainView = Backbone.View.extend({
  el: $('body'),

  $home: $('#home'),

  $discussionsPanelsContainer: $('#center'),

  firstConnection: true,

  thisDiscussionShouldBeFocusedOnSuccess: '',

  defaultColor: '',

  currentColor: '',

  views: {},

  interval: null,

  intervalDuration: 240000, // ms

  events: {
    'click .go-to-search': 'focusOnSearch',
    'click .open-create-room': 'openCreateRoom',
    'click .open-user-edit': 'openUserEdit',
    'click .open-user-preferences': 'openUserPreferences',
    'click .open-user-account': 'openUserAccount',
    'click .open-user-profile': 'onOpenUserProfile',
    'click .action-user-ban': 'userBan',
    'click .action-user-deban': 'userDeban',
    'dblclick .dbl-open-user-profile': 'onOpenUserProfile',
    'click .open-room-profile': 'onOpenRoomProfile',
    'click .open-room-edit': 'openRoomEdit',
    'click .open-room-preferences': 'openRoomPreferences',
    'click .open-room-users': 'openRoomUsers',
    'click .open-room-delete': 'openRoomDelete',
    'click .close-discussion': 'onCloseDiscussion',
    'click .open-room-access': 'openRoomAccess',
    'click .switch[data-language]': 'switchLanguage'
  },

  initialize: function () {
    this.defaultColor = window.room_default_color;

    this.listenTo(client, 'welcome', this.onWelcome);
    this.listenTo(client, 'admin:message', this.onAdminMessage);
    this.listenTo(client, 'disconnect', this.onDisconnect);
    this.listenTo(rooms, 'add', this.addView);
    this.listenTo(rooms, 'remove', this.onRemoveDiscussion);
    this.listenTo(onetoones, 'add', this.addView);
    this.listenTo(onetoones, 'remove', this.onRemoveDiscussion);
    this.listenTo(rooms, 'kickedOrBanned', this.roomKickedOrBanned);
    this.listenTo(rooms, 'allowed', this.roomAllowed);
    this.listenTo(rooms, 'join', this.roomJoin);
    this.listenTo(rooms, 'deleted', this.roomRoomDeleted);
    this.listenTo(app, 'focusHome', this.focusHome);
    this.listenTo(app, 'focusRoom', this.focusRoomByName);
    this.listenTo(app, 'focusOneToOne', this.focusOneToOneByUsername);
    this.listenTo(app, 'openRoomProfile', this.openRoomProfile);
    this.listenTo(app, 'openUserProfile', this.openUserProfile);
    this.listenTo(app, 'joinRoom', this.focusRoomByName);
    this.listenTo(app, 'joinOnetoone', this.focusOneToOneByUsername);
    this.listenTo(app, 'changeColor', this.onChangeColor);
    this.listenTo(app, 'persistPositions', this.persistPositions);
    this.listenTo(app, 'changeTitle', this.onChangeTitle);
  },
  run: function () {
    // generate and attach subviews
    this.currentUserView = new CurrentUserView({model: currentUser});
    this.discussionsBlock = new DiscussionsBlockView();
    this.drawerView = new DrawerView();
    this.alertView = new AlertView();
    this.connectionView = new ConnectionModalView();
    this.welcomeView = new WelcomeModalView();
    this.notificationsView = new NotificationsView();
    this.muteView = new MuteView();

    // @debug
    // @todo : mount only on debug mode
    window.d = {
      $: $,
      app: app,
      current: currentUser,
      rooms: rooms,
      onetoones: onetoones,
      client: client,
      main: this
    };

    client.connect();
  },

  /**
   * Executed each time the connexion with server is re-up (can occurs multiple
   * time in a same session)
   * @param data
   */
  onWelcome: function (data) {
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

    // Rooms
    _.each(data.rooms, function (room) {
      rooms.addModel(room);
    });

    // One to ones
    _.each(data.onetoones, function (one) {
      onetoones.addModel(one);
    });

    // blocked
    _.each(data.blocked, function (lock) {
      rooms.addModel(lock, lock.blocked ? lock.blocked : true);
    });

    this.discussionsBlock.redraw();

    // Notifications
    if (data.notifications) {
      this.notificationsView.initializeNotificationState(data.notifications);
    }
    this.firstConnection = false;

    // Run routing only when everything in interface is ready
    app.trigger('readyToRoute');
    this.connectionView.hide();
    debug.end('welcome');
  },
  onAdminMessage: function (data) {
    app.trigger('alert', 'info', data.message);
  },
  onDisconnect: function () {
    // disable interval
    clearInterval(this.interval);

    // force data re-fetching on next focus
    _.each(this.views, function (view) {
      view.hasBeenFocused = false;
      // @todo : to cover completely this case we should:
      //   - on short disconnection: request history for bottom of the discussion from last known event
      //   - on long disconnection: cleanup history and request normal history
    });
  },

  _color: function (color) {
    $('body').removeClass(function (index, css) {
      return (css.match(/(dc-\S+)+/g) || []).join(' ');
    }).addClass('dc-' + color.replace('#', '').toLowerCase());
  },
  color: function (color, temporary, reset) {
    if (reset) {
      return this._color(this.currentColor);
    }
    color = color || this.defaultColor;

    if (!temporary) {
      this.currentColor = color;
    }
    return this._color(color);
  },
  onChangeColor: function (color, temporary, reset) {
    this.color(color, temporary, reset);
  },

  viewportIs: function (expression) {
    var pattern = /^(<|>|=)(xs|sm|md|lg)$/;
    if (!pattern.test(expression)) {
      return;
    }
    var matches = expression.match(pattern);
    if (!matches || !matches[1] || !matches[2]) {
      return;
    }
    var $root = $('body > .responsive');
    if (!$root || !$root.length) {
      return;
    }
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
      if (breakpoint === 'xs') {
        return ((breakpoints['sm'] || breakpoints['md'] || breakpoints['lg']) && !breakpoints['xs']);
      } else if (breakpoint === 'sm') {
        return ((breakpoints['md'] || breakpoints['lg']) && !breakpoints['sm']);
      } else if (breakpoint === 'md') {
        return (breakpoints['lg'] && !breakpoints['md']);
      } else {
        return false;
      }
    } else if (compare === '<') {
      if (breakpoint === 'lg') {
        return ((breakpoints['md'] || breakpoints['sm'] || breakpoints['xs']) && !breakpoints['lg']);
      } else if (breakpoint === 'md') {
        return ((breakpoints['sm'] || breakpoints['xs']) && !breakpoints['md']);
      } else if (breakpoint === 'sm') {
        return (breakpoints['xs'] && !breakpoints['sm']);
      } else {
        return false;
      }
    }
  },

  _handleAction: function (event) {
    if (!event) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
  },

  /**
   * Trigger when currentUser is kicked or banned from a room to handle focus and
   * notification
   * @param event
   * @returns {boolean}
   */
  roomKickedOrBanned: function (event) {
    var what = event.what;
    var data = event.data;
    if (event.wasFocused) { // if remove model was focused, focused the new one
      this.focus(event.model);
    }
    var message;
    switch (what) {
      case 'kick':
        message = i18next.t('chat.kickmessage', {name: data.name});
        break;
      case 'ban':
        message = i18next.t('chat.banmessage', {name: data.name});
        break;
      case 'disallow':
        message = i18next.t('chat.disallowmessage', {name: data.name});
        break;
    }
    if (data.reason) {
      message += ' ' + i18next.t('chat.reason', {reason: _.escape(data.reason)});
    }
    app.trigger('alert', 'warning', message);
  },
  roomAllowed: function (event) {
    if (event.wasFocused) { // if remove model was focused, focused the new one
      this.focus(event.model);
    }
  },
  roomJoin: function (event) {
    if (event.wasFocused) { // if remove model was focused, focused the new one
      this.focus(event.model);
    }
  },
  roomRoomDeleted: function (data) {
    this.focus();
    if (data && data.reason) {
      app.trigger('alert', 'warning', data.reason);
    }
  },

  // DRAWERS
  // ======================================================================

  openCreateRoom: function (event) {
    event.preventDefault();
    var name = $(event.currentTarget).data('name') || '';
    var view = new DrawerRoomCreateView({name: name});
    this.drawerView.setSize('450px').setView(view).open();
    view.focusField();
  },
  openUserAccount: function (event) {
    event.preventDefault();
    var view = new DrawerUserAccountView();
    this.drawerView.setSize('380px').setView(view).open();
  },
  onOpenUserProfile: function (event) {
    this.$el.find('.tooltip').tooltip('hide');
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }
    var view = new DrawerUserProfileView({user_id: userId});
    this.drawerView.setSize('380px').setView(view).open();
  },
  openUserProfile: function (data) {
    var view = new DrawerUserProfileView({data: data});
    this.drawerView.setSize('380px').setView(view).open();
  },
  onOpenRoomProfile: function (event) {
    this.$el.find('.tooltip').tooltip('hide');
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }
    var view = new DrawerRoomProfileView({room_id: roomId});
    this.drawerView.setSize('380px').setView(view).open();
  },
  openRoomProfile: function (data) {
    var view = new DrawerRoomProfileView({data: data});
    this.drawerView.setSize('380px').setView(view).open();
  },
  openRoomEdit: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }
    var view = new DrawerRoomEditView({room_id: roomId});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomUsers: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }

    var model = rooms.get(roomId);
    if (!model) {
      return;
    }

    var view = new DrawerRoomUsersView({model: model});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomAccess: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }

    var view = new DrawerRoomAccessView({room_id: roomId});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomPreferences: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }

    var model = rooms.get(roomId);
    if (!model) {
      return;
    }

    var view = new DrawerRoomPreferencesView({model: model});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomDelete: function (event) {
    event.preventDefault();
    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }
    var view = new DrawerRoomDeleteView({room_id: roomId});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openUserEdit: function (event) {
    event.preventDefault();
    var view = new DrawerUserEditView();
    this.drawerView.setSize('450px').setView(view).open();
  },
  openUserPreferences: function (event) {
    event.preventDefault();
    var view = new DrawerUserPreferencesView();
    this.drawerView.setSize('450px').setView(view).open();
  },

  // DISCUSSIONS MANAGEMENT
  // ======================================================================

  addView: function (model, collection) {
    var constructor;
    if (model.get('type') === 'room') {
      if (model.get('blocked')) {
        constructor = RoomViewBlocked;
      } else {
        constructor = RoomView;
      }
    } else {
      constructor = OneToOneView;
    }

    // create view
    var view = new constructor({
      collection: collection,
      model: model
    });

    // add to views list
    this.views[model.get('id')] = view;

    // append to DOM
    this.$discussionsPanelsContainer.append(view.$el);

    var identifier = (model.get('type') === 'room') ? model.get('name') : model.get('username');
    if (this.thisDiscussionShouldBeFocusedOnSuccess === identifier) {
      this.focus(model);
      this.thisDiscussionShouldBeFocusedOnSuccess = null;
    }

    this.discussionsBlock.redraw();
  },

  onCloseDiscussion: function (event) {
    this._handleAction(event);

    var $target = $(event.currentTarget);
    if (!$target) {
      return;
    }
    var type = $target.data('type');
    var identifier = $target.data('identifier');
    var model;
    if (type === 'room') {
      model = rooms.findWhere({id: identifier});
    } else {
      model = onetoones.findWhere({user_id: '' + identifier}); // force string to handle fully numeric username
    }

    if (typeof model === 'undefined') {
      return debug('close discussion error: unable to find model');
    }
    model.leave(); // trigger a server back and forth, *:leave will remove view from interface

    return false; // stop propagation
  },
  onRemoveDiscussion: function (model) {
    var view = this.views[model.get('id')];
    if (view === undefined) {
      return debug('close discussion error: unable to find view');
    }
    var wasFocused = model.get('focused');

    view.removeView();
    delete this.views[model.get('id')];

    this.persistPositions(true); // warning, this call (will trigger broadcast to all user sockets) could generate weird behavior on discussion block on multi-devices

    // Focus default
    if (wasFocused) {
      this.focusHome();
    } else {
      this.discussionsBlock.redraw();
    }
  },

  persistPositions: function (silent) {
    silent = silent | false;

    var positions = [];
    this.discussionsBlock.$list.find('a.item').each(function () {
      var identifier = '' + $(this).data('identifier'); // force string to handle fully numeric username
      if (identifier) {
        positions.push(identifier);
      }
    });

    currentUser.set({positions: positions}, {silent: silent});
    client.userUpdate({positions: positions}, function (data) {
      if (data.err) {
        debug('error(s) on userUpdate call', data.errors);
      }
    });
  },

//    updateViews: function () {
//      // call update() method on each view
//      _.each(this.views, function (view) {
//        debug('update on ' + view.model.get('id'));
//      });
//
//      // set next tick
//      this.interval = setTimeout(_.bind(function () {
//        this.updateViews();
//      }, this), this.intervalDuration);
//    },

  // FOCUS TAB/PANEL MANAGEMENT
  // ======================================================================

  focusOnSearch: function () {
    this.focusHome(true);
    this.homeView.searchView.$search
      .focus();
    this.drawerView.close();
  },

  unfocusAll: function () {
    rooms.each(function (o) {
      o.set('focused', false);
    });
    onetoones.each(function (o) {
      o.set('focused', false);
    });
    this.$home.hide();
  },

  // called by router only
  focusHome: function (avoidReload) {
    // init view
    if (!this.homeView) {
      this.homeView = new HomeView({});
    }
    if (avoidReload !== true) {
      this.homeView.request();
    }
    this.unfocusAll();
    this.$home.show();
    windowView.setTitle();
    this.discussionsBlock.redraw();
    this.color(this.defaultColor);
    Backbone.history.navigate('#'); // just change URI, not run route action
  },

  focusRoomByName: function (name) {
    var model = rooms.iwhere('name', name);
    if (typeof model !== 'undefined') {
      model.resetNew();
      return this.focus(model);
    }

    // Not already open
    this.thisDiscussionShouldBeFocusedOnSuccess = name;
    client.roomJoin(null, name, null, _.bind(function (response) {
      if (response.code === 404) {
        return app.trigger('alert', 'error', i18next.t('chat.roomnotexists', { name: name }));
      } else if (response.code === 403) {
        return rooms.addModel(response.room, response.err);
      } else if (response.code === 500) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
    }, this));
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

  focus: function (model) {
    // No opened discussion, display default
    if (rooms.length < 1 && onetoones.length < 1) {
      return this.focusHome();
    }

    // No discussion provided, take first
    if (typeof model === 'undefined') {
      model = rooms.first();
      if (typeof model === 'undefined') {
        model = onetoones.first();
        if (typeof model === 'undefined') {
          return this.focusHome();
        }
      }
    }

    // unfocus every model
    this.unfocusAll();

    // Focus the one we want
    model.set('focused', true);
    this.discussionsBlock.redraw();

    // Change interface color
    if (model.get('color')) {
      this.color(model.get('color'));
    } else {
      this.color(this.defaultColor);
    }
    // Update URL (always!) and page title
    var uri;
    var title;
    if (model.get('type') === 'room') {
      uri = 'room/' + model.get('name').replace('#', '');
      title = model.get('name');
    } else {
      uri = 'user/' + model.get('username');
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

    ConfirmationView.open({}, _.bind(function () {
      client.userBan(userId, null);
      app.trigger('userBan');
    }, this));
  },

  userDeban: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    ConfirmationView.open({}, _.bind(function () {
      client.userDeban(userId);
      app.trigger('userDeban');
    }, this));
  },

  onChangeTitle: function (model) {
    var title;
    if (model.get('type') === 'room') {
      title = model.get('name');
    } else {
      title = model.get('username');
    }
    windowView.setTitle(title);
  },

  switchLanguage: function (event) {
    event.preventDefault();
    var language = $(event.currentTarget).data('language');
    if (!language) {
      return;
    }

    var d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = 'donut.lng' + '=' + language + '; ' + expires;
    window.location.reload();
  }
});

module.exports = new MainView();
