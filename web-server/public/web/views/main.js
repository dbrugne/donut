var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');

var debug = require('../libs/donut-debug')('donut:main');

var i18next = require('i18next-client');
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
var DrawerGroupUsersAllowedView = require('./drawer-group-users-allowed');
var DrawerUserProfileView = require('./drawer-user-profile');
var DrawerUserNotificationsView = require('./drawer-user-notifications');
var NotificationsView = require('./notifications');
var DrawerUserEditView = require('./drawer-user-edit');
var DrawerUserPreferencesView = require('./drawer-user-preferences');
var DrawerUserAccountView = require('./drawer-account');
var ModalView = require('./modal');
var ModalJoinGroupView = require('./modal-join-group');
var ModalChooseUsernameView = require('./modal-choose-username');
var NavOnesView = require('./nav-ones');
var NavRoomsView = require('./nav-rooms');
var ConfirmationView = require('./modal-confirmation');
var MuteView = require('./mute');
var SearchView = require('./home-search');

var MainView = Backbone.View.extend({
  el: $('body'),

  firstConnection: true,

  defaultColor: '',

  currentColor: '',

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
    'click .open-group-users-allowed': 'openGroupUsersAllowed',
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

    this.listenTo(app.client, 'welcome', this.onWelcome);
    this.listenTo(app.client, 'admin:message', this.onAdminMessage);
    this.listenTo(app.rooms, 'deleted', this.roomDeleted);
    this.listenTo(app, 'openRoomProfile', this.openRoomProfile);
    this.listenTo(app, 'openGroupProfile', this.openGroupProfile);
    this.listenTo(app, 'openUserProfile', this.openUserProfile);
    this.listenTo(app, 'openGroupJoin', this.openGroupJoin);
    this.listenTo(app, 'changeColor', this.onChangeColor);
  },
  run: function () {
    this.currentUserView = new CurrentUserView({el: this.$el.find('#block-current-user'), model: app.user});
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
    window.d = {
      $: $,
      app: app,
      main: this
    };

    app.client.connect();
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
      return this.openModalChooseUsername();
    }

    app.user.onWelcome(data);
    app.ones.onWelcome(data);
    app.rooms.onWelcome(data);
    app.groups.onWelcome(data);

    // Only on first connection
    if (this.firstConnection) { // show if true or if undefined
      if (app.user.shouldDisplayWelcome()) {
        this.welcomeView.render(data);
        this.welcomeView.show();
      }
    }

    this.notificationsView.updateCount(data.notifications.unread);
    this.notificationsView.updateHandle();

    // Run routing only when everything in interface is ready
    this.firstConnection = false;
    app.trigger('readyToRoute');
    this.connectionView.hide();
  },
  onAdminMessage: function (data) {
    app.trigger('alert', 'info', data.message);
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
      var model = app.groups.findWhere({id: data.group_id});
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

    if (app.groups.isMemberBanned(groupId)) {
      return app.trigger('alert', 'error', i18next.t('chat.form.errors.group-banned'));
    }

    if (!app.groups.isMemberOwnerAdmin(groupId)) {
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

    var model = app.groups.get(groupId);
    if (!model) {
      return;
    }

    var view = new DrawerGroupUsersView({model: model});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openGroupUsersAllowed: function (event) {
    event.preventDefault();

    var groupId = $(event.currentTarget).data('group-id');
    if (!groupId) {
      return;
    }

    var model = app.groups.get(groupId);
    if (!model) {
      return;
    }

    var view = new DrawerGroupUsersAllowedView({model: model});
    this.drawerView.setSize('450px').setView(view).open();
  },
  openUserAccount: function (event) {
    event.preventDefault();
    var view = new DrawerUserAccountView();
    this.drawerView.setSize('450px').setView(view).open();
  },
  onOpenUserNotifications: function (event) {
    event.preventDefault();
    var view = new DrawerUserNotificationsView({user_id: app.user.get('user_id')});
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

    var userId = app.user.get('user_id');
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

    var model = app.groups.get(groupId);
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

    var model = app.rooms.get(roomId);
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

  // MODALS
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
      model = app.rooms.findWhere({id: identifier});
    } else {
      model = app.ones.findWhere({user_id: '' + identifier}); // force
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
  onCloseGroup: function (event) {
    event.preventDefault();

    var groupId = $(event.currentTarget).data('groupId');
    if (!groupId) {
      return;
    }

    // Current user is a member of the selected group
    if (app.groups.isMember(groupId)) {
      ConfirmationView.open({message: 'close-group'}, _.bind(function () {
        app.client.groupLeave(groupId, function (response) {
          if (response.err) {
            return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        });
      }, this));
    // current user is not a member
    } else {
      var model = app.groups.findWhere({id: groupId});
      if (!app.rooms.getByGroup(groupId)) {
        return app.groups.remove(model);
      }
      return app.trigger('alert', 'error', i18next.t('global.cannot-leave-group'));
    }
  },

  userBan: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    ConfirmationView.open({message: 'ban-user'}, _.bind(function () {
      app.client.userBan(userId);
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
      app.client.userDeban(userId);
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
    var room = app.rooms.get(elt.data('room-id'));
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

    if (!_.isFunction(app.client[method])) {
      return;
    }

    if (confirm) {
      if (input) {
        ConfirmationView.open({message: key}, function () {
          app.client[method](room.get('id'), user.get('id'));
        });
      } else {
        ConfirmationView.open({message: key, input: true}, function (reason) {
          app.client[method](room.get('id'), user.get('id'), reason);
        });
      }
    } else {
      app.client[method](room.get('id'), user.get('id'));
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
