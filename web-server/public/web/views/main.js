var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var donutDebug = require('../libs/donut-debug');
var app = require('../libs/app');
var client = require('../libs/client');
var i18next = require('i18next-client');
var currentUser = require('../models/current-user');
var groups = require('../collections/groups');
var rooms = require('../collections/rooms');
var onetoones = require('../collections/onetoones');
var ConnectionModalView = require('./modal-connection');
var WelcomeModalView = require('./modal-welcome');
var CurrentUserView = require('./current-user');
var AlertView = require('./alert');
var DrawerView = require('./drawer');
var DrawerRoomAccessView = require('./drawer-room-access');
var DrawerRoomCreateView = require('./drawer-room-create');
var DrawerGroupCreateView = require('./drawer-group-create');
var DrawerRoomProfileView = require('./drawer-room-profile');
var DrawerRoomEditView = require('./drawer-room-edit');
var DrawerGroupEditView = require('./drawer-group-edit');
var DrawerRoomUsersView = require('./drawer-room-users');
var DrawerRoomUsersAllowedView = require('./drawer-room-users-allowed');
var DrawerRoomPreferencesView = require('./drawer-room-preferences');
var DrawerRoomDeleteView = require('./drawer-room-delete');
var DrawerGroupDeleteView = require('./drawer-group-delete');
var DrawerGroupProfileView = require('./drawer-group-profile');
var DrawerGroupAccessView = require('./drawer-group-access');
var DrawerGroupUsersView = require('./drawer-group-users');
var DrawerUserProfileView = require('./drawer-user-profile');
var DrawerUserNotificationsView = require('./drawer-user-notifications');
var NotificationsView = require('./notifications');
var DrawerUserEditView = require('./drawer-user-edit');
var DrawerUserPreferencesView = require('./drawer-user-preferences');
var DrawerUserAccountView = require('./drawer-account');
var ModalView = require('./modal');
var ModalJoinGroupView = require('./modal-join-group');
var ModalChooseUsernameView = require('./modal-choose-username');
var GroupView = require('./group');
var RoomView = require('./discussion-room');
var RoomViewBlocked = require('./discussion-room-blocked');
var OneToOneView = require('./discussion-onetoone');
var NavOnesView = require('./nav-ones');
var NavRoomsView = require('./nav-rooms');
var ConfirmationView = require('./modal-confirmation');
var MuteView = require('./mute');
var SearchView = require('./home-search');

var debug = donutDebug('donut:main');

var MainView = Backbone.View.extend({
  el: $('body'),

  $discussionsPanelsContainer: $('#center'),

  firstConnection: true,

  defaultColor: '',

  currentColor: '',

  views: {},

  interval: null,

  intervalDuration: 240000, // ms

  events: {
    'click .go-to-search': 'goToSearch',
    'click .open-create-room': 'openCreateRoom',
    'click .open-user-edit': 'openUserEdit',
    'click .open-user-preferences': 'openUserPreferences',
    'click .open-user-account': 'openUserAccount',
    'click .open-user-profile': 'onOpenUserProfile',
    'click .open-current-user-profile': 'onOpenCurrentUserProfile',
    'click .toggle-current-user-sounds': 'onToggleCurrentUserSounds',
    'click .open-user-notifications': 'onOpenUserNotifications',
    'dblclick .dbl-open-user-profile': 'onOpenUserProfile',
    'click .open-room-profile': 'onOpenRoomProfile',
    'click .open-room-edit': 'openRoomEdit',
    'click .open-group-edit': 'openGroupEdit',
    'click .open-room-preferences': 'openRoomPreferences',
    'click .open-room-users': 'openRoomUsers',
    'click .open-room-users-allowed': 'openRoomUsersAllowed',
    'click .open-room-delete': 'openRoomDelete',
    'click .open-group-profile': 'onOpenGroupProfile',
    'click .open-group-delete': 'openGroupDelete',
    'click .open-group-access': 'onOpenGroupAccess',
    'click .open-group-create': 'openGroupCreate',
    'click .open-group-users': 'openGroupUsers',
    'click .close-group': 'onCloseGroup',
    'click .close-discussion': 'onCloseDiscussion',
    'click .open-room-access': 'openRoomAccess',
    'click .switch[data-language]': 'switchLanguage',

    'click .action-user-ban': 'userBan',
    'click .action-user-deban': 'userDeban',

    'click .op-user': 'opUser',
    'click .deop-user': 'deopUser',
    'click .kick-user': 'kickUser',
    'click .ban-user': 'banUser',
    'click .voice-user': 'voiceUser',
    'click .devoice-user': 'devoiceUser'
  },

  initialize: function () {
    this.defaultColor = window.room_default_color;

    this.listenTo(client, 'welcome', this.onWelcome);
    this.listenTo(client, 'admin:message', this.onAdminMessage);
    this.listenTo(client, 'disconnect', this.onDisconnect);
    this.listenTo(groups, 'add', this.addView);
    this.listenTo(groups, 'remove', this.onRemoveGroupView);
    this.listenTo(rooms, 'add', this.addView);
    this.listenTo(rooms, 'remove', this.onRemoveDiscussion);
    this.listenTo(onetoones, 'add', this.addView);
    this.listenTo(onetoones, 'remove', this.onRemoveDiscussion);
    this.listenTo(rooms, 'deleted', this.roomDeleted);
    this.listenTo(app, 'openRoomProfile', this.openRoomProfile);
    this.listenTo(app, 'openGroupProfile', this.openGroupProfile);
    this.listenTo(app, 'openUserProfile', this.openUserProfile);
    this.listenTo(app, 'openGroupJoin', this.openGroupJoin);
    this.listenTo(app, 'changeColor', this.onChangeColor);
  },
  run: function () {
    // generate and attach subviews
    this.currentUserView = new CurrentUserView({el: this.$el.find('#block-current-user'), model: currentUser});
    this.navOnes = new NavOnesView();
    this.navRooms = new NavRoomsView();
    this.drawerView = new DrawerView();
    this.modalView = new ModalView();
    this.alertView = new AlertView();
    this.connectionView = new ConnectionModalView();
    this.welcomeView = new WelcomeModalView();
    this.muteView = new MuteView();
    this.notificationsView = new NotificationsView();
    this.searchView = new SearchView({
      el: this.$('#navbar .search')
    });

    this.$dropdownResults = this.$('.search .results');
    this.$search = this.$('.search');

    // @debug
    // @todo dbr : mount only on debug mode
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
    // Is username required
    if (data.usernameRequired) {
      this.connectionView.hide();
      this.openModalChooseUsername();
      return console.log('pop choose username');
    }

    currentUser.onWelcome(data);
    onetoones.onWelcome(data);
    rooms.onWelcome(data);

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

    this.notificationsView.updateCount(data.notifications.unread);

    // Run routing only when everything in interface is ready
    this.firstConnection = false;
    app.trigger('readyToRoute');
    this.connectionView.hide();
  },
  onAdminMessage: function (data) {
    app.trigger('alert', 'info', data.message);
  },
  onDisconnect: function () {
    // disable interval
    clearInterval(this.interval);

    // force data re-fetching on next focus
    _.each(this.views, function (view) {
      view.reconnect = true;
      if (view.eventsView) {
        view.eventsView.$realtime.append('<div class="block disconnect"></div>');
      }
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
  roomDeleted: function (data) {
    if (data.was_focused) {
      app.trigger('focus');
    }

    if (data.group_id) {
      var model = groups.findWhere({id: data.group_id});
      model.onDeleteRoom(data.room_id);
    }

    app.trigger('alert', 'warning', i18next.t('chat.deletemessage', {name: data.name}));
  },

  // DRAWERS
  // ======================================================================

  openCreateRoom: function (event) {
    event.preventDefault();
    var name = $(event.currentTarget).data('name') || '';

    var groupId = $(event.currentTarget).data('groupId');
    var groupName = $(event.currentTarget).data('groupName');
    var view;

    if (!groupId) {
      view = new DrawerRoomCreateView({name: name});
      this.drawerView.setSize('450px').setView(view).open();
      return view.focusField();
    }

    if (groups.isMemberBanned(groupId)) {
      return app.trigger('alert', 'error', i18next.t('chat.form.errors.group-banned'));
    }

    if (!groups.isMemberOwnerAdmin(groupId)) {
      return app.trigger('alert', 'error', i18next.t('chat.form.errors.not-admin-owner-groupowner'));
    }

    view = new DrawerRoomCreateView({
      name: name,
      group_id: groupId,
      group_name: groupName
    });
    this.drawerView.setSize('450px').setView(view).open();
    return view.focusField();
  },
  openGroupCreate: function () {
    var view = new DrawerGroupCreateView();
    this.drawerView.setSize('450px').setView(view).open();
    view.focusField();
  },
  openGroupUsers: function (event) {
    event.preventDefault();

    var groupId = $(event.currentTarget).data('group-id');
    if (!groupId) {
      return;
    }

    var model = groups.get(groupId);
    if (!model) {
      return;
    }

    var view = new DrawerGroupUsersView({model: model});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openUserAccount: function (event) {
    event.preventDefault();
    var view = new DrawerUserAccountView();
    this.drawerView.setSize('450px').setView(view).open();
  },
  onOpenUserNotifications: function (event) {
    event.preventDefault();
    var view = new DrawerUserNotificationsView({user_id: currentUser.get('user_id')});
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
  openUserProfile: function (userId) {
    var view = new DrawerUserProfileView({user_id: userId});
    this.drawerView.setSize('380px').setView(view).open();
  },
  onOpenCurrentUserProfile: function (event) {
    event.preventDefault();

    var userId = currentUser.get('user_id');
    if (!userId) {
      return;
    }

    var view = new DrawerUserProfileView({user_id: userId});
    this.drawerView.setSize('380px').setView(view).open();
  },
  onToggleCurrentUserSounds: function (event) {
    event.preventDefault();
    this.muteView.toggle();
  },
  onOpenGroupProfile: function (event) {
    this.$el.find('.tooltip').tooltip('hide');
    event.preventDefault();

    var groupId = $(event.currentTarget).data('group-id');
    if (!groupId) {
      return;
    }
    var view = new DrawerGroupProfileView({group_id: groupId});
    this.drawerView.setSize('380px').setView(view).open();
  },
  onOpenGroupAccess: function (event) {
    this.$el.find('.tooltip').tooltip('hide');
    event.preventDefault();

    var groupId = $(event.currentTarget).data('group-id');
    if (!groupId) {
      return;
    }

    var model = groups.get(groupId);
    if (!model) {
      return;
    }

    var view = new DrawerGroupAccessView({model: model});
    this.drawerView.setSize('380px').setView(view).open();
  },
  openGroupProfile: function (data) {
    var view = new DrawerGroupProfileView({data: data});
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
  openRoomProfile: function (roomId) {
    var view = new DrawerRoomProfileView({room_id: roomId});
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
  openGroupEdit: function (event) {
    event.preventDefault();

    var groupId = $(event.currentTarget).data('groupId');
    if (!groupId) {
      return;
    }
    var view = new DrawerGroupEditView({group_id: groupId});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomUsers: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }

    var view = new DrawerRoomUsersView({room_id: roomId});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openRoomUsersAllowed: function (event) {
    event.preventDefault();

    var roomId = $(event.currentTarget).data('roomId');
    if (!roomId) {
      return;
    }

    var view = new DrawerRoomUsersAllowedView({room_id: roomId});
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
  openGroupDelete: function (event) {
    event.preventDefault();
    var groupId = $(event.currentTarget).data('groupId');
    if (!groupId) {
      return;
    }
    var view = new DrawerGroupDeleteView({group_id: groupId});
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

  // MODAL
  // ======================================================================

  openGroupJoin: function (data) {
    if (!data) {
      return;
    }
    var view = new ModalJoinGroupView({data: data});
    this.modalView.setView(view).open();
  },

  openModalChooseUsername: function () {
    var view = new ModalChooseUsernameView();
    this.modalView.setView(view).open({'show': true, keyboard: false, backdrop: 'static'});
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
    } else if (model.get('type') === 'group') {
      constructor = GroupView;
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
    app.trigger('viewAdded', model, collection);
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
      model = onetoones.findWhere({user_id: '' + identifier}); // force
                                                               // string to
                                                               // handle
                                                               // fully
                                                               // numeric
                                                               // username
    }

    if (typeof model === 'undefined') {
      return debug('close discussion error: unable to find model');
    }
    model.leave(); // trigger a server back and forth, *:leave will remove view
                   // from interface

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

    if (model.get('type') === 'room') {
      app.trigger('redrawNavigationRooms');
    } else {
      app.trigger('redrawNavigationOnes');
    }

    // focus default (home)
    if (wasFocused) {
      Backbone.history.navigate('#', {trigger: true});
    }
  },
  onCloseGroup: function (event) {
    event.preventDefault();

    var groupId = $(event.currentTarget).data('groupId');
    if (!groupId) {
      return;
    }
    ConfirmationView.open({message: 'close-group'}, _.bind(function () {
      client.groupLeave(groupId, function (response) {
        if (response.err) {
          return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
        }
      });
    }, this));
  },
  onRemoveGroupView: function (model, collection) {
    var view = this.views[model.get('id')];
    if (view === undefined) {
      return debug('close group view error: unable to find view');
    }
    var wasFocused = model.get('focused');

    view.removeView();
    delete this.views[model.get('id')];

    app.trigger('refreshRoomsList');

    // focus default (home)
    if (wasFocused) {
      Backbone.history.navigate('#', {trigger: true});
    }
  },
  userBan: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    ConfirmationView.open({message: 'ban-user'}, _.bind(function () {
      client.userBan(userId);
      app.trigger('userBan');
    }, this));
  },
  userDeban: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    ConfirmationView.open({message: 'deban-user'}, _.bind(function () {
      client.userDeban(userId);
      app.trigger('userDeban');
    }, this));
  },

  _userRoomActions: function (event, key, confirm, input, method) {
    event.preventDefault();
    var elt = $(event.currentTarget);

    // check that required params are set
    if (!elt || !elt.data('user-id') || !elt.data('room-id')) {
      return null;
    }

    // check that rooms exists in my rooms
    var room = rooms.get(elt.data('room-id'));
    if (!room) {
      return null;
    }

    // check that I am op or owner or admin
    if (!room.currentUserIsOp() && !room.currentUserIsOwner() && !room.currentUserIsAdmin()) {
      return null;
    }

    // check that user exists in this room
    var user = room.users.get(elt.data('user-id'));
    if (!user) {
      return null;
    }

    if (!_.isFunction(client[method])) {
      return;
    }

    if (confirm) {
      if (input) {
        ConfirmationView.open({message: key}, function () {
          client[method](room.get('id'), user.get('id'));
        });
      } else {
        ConfirmationView.open({message: key, input: true}, function (reason) {
          client[method](room.get('id'), user.get('id'), reason);
        });
      }
    } else {
      client[method](room.get('id'), user.get('id'));
    }
  },
  opUser: function (event) {
    return this._userRoomActions(event, 'op-room-user', true, false, 'roomOp');
  },
  deopUser: function (event) {
    return this._userRoomActions(event, 'deop-room-user', true, false, 'roomDeop');
  },
  kickUser: function (event) {
    return this._userRoomActions(event, 'kick-room-user', true, true, 'roomKick');
  },
  banUser: function (event) {
    return this._userRoomActions(event, 'ban-room-user', true, true, 'roomBan');
  },
  voiceUser: function (event) {
    return this._userRoomActions(event, '', false, false, 'roomVoice');
  },
  devoiceUser: function (event) {
    return this._userRoomActions(event, 'devoice-room-user', true, true, 'roomDevoice');
  },

  goToSearch: function (event) {
    app.trigger('goToSearch', event);
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
