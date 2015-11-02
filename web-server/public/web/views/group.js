var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var ConfirmationView = require('./modal-confirmation');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../libs/app');
var urls = require('../../../../shared/util/url');
var date = require('../libs/date');
var GroupUsersView = require('./group-users');
var CardsView = require('./cards');

var GroupView = Backbone.View.extend({
  template: require('../templates/group.html'),

  tagName: 'div',

  className: 'group',

  events: {
    'click .request-allowance': 'onRequestAllowance',
    'click .send-password': 'onSendPassword'
  },

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:members', this.refreshUsers);
    this.listenTo(this.model, 'change:op', this.refreshUsers);
    this.listenTo(this.model, 'change:rooms', this.render);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'redraw', this.render);
    this.render();
  },
  render: function () {
    var group = this.model.toJSON();
    var isMember = this.model.currentUserIsMember();
    var isOwner = this.model.currentUserIsOwner();
    var isOp = this.model.currentUserIsOp();
    var isAdmin = this.model.currentUserIsAdmin();
    var bannedObject = this.model.currentUserIsBanned();

    // prepare avatar for group
    group.avatarUrl = common.cloudinary.prepare(group.avatar, 160);
    // prepare room avatar & uri
    var rooms = [];
    _.each(group.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);
      room.owner_id = room.owner.user_id;
      room.owner_username = room.owner.username;
      room.group_id = group.group_id;
      room.group_name = group.name;
      room.identifier = '#' + room.name;
      room.join = urls(room, 'room', 'uri');
      room.type = 'room';
      rooms.push(room);
    });
    if (group.disclaimer) {
      group.disclaimer = _.escape(group.disclaimer);
    }
    var data = {
      isMember: isMember,
      isOp: isOp,
      isOwner: isOwner,
      isAdmin: isAdmin,
      isBanned: !!bannedObject,
      group: group
    };
    if (typeof bannedObject !== 'undefined') {
      data.banned_at = date.longDate(bannedObject.banned_at);
      data.reason = bannedObject.reason;
    }

    var html = this.template(data);
    this.$el.html(html);
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.cardsView.render({
      rooms: {
        list: rooms
      },
      title: false,
      fill: true,
      more: false,
      search: false
    });

    this.groupUsersView = new GroupUsersView({
      el: this.$('.side .users'),
      model: this.model
    });

    this.initializeTooltips();
    return this;
  },
  removeView: function () {
    this.groupUsersView._remove();
    this.cardsView._remove();
    this.remove();
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  onRequestAllowance: function (event) {
    var options = {
      message: 'request-allowance',
      area: true
    };

    ConfirmationView.open(options, _.bind(function (message) {
      client.groupJoinRequest(this.model.get('group_id'), message, function (response) {
        if (response.err) {
          if (response.err === 'allow-pending' || response.err === 'message-wrong-format') {
            app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
          } else {
            app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        } else {
          app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
        }
      });
    }, this));
  },
  onSendPassword: function (event) {
    var options = {
      password: true
    };

    ConfirmationView.open(options, _.bind(function (password) {
      client.groupJoin(this.model.get('group_id'), password, _.bind(function (response) {
        if (response.err) {
          if (response.err === 'wrong-password' || response.err === 'params-password') {
            app.trigger('alert', 'error', i18next.t('chat.password.wrong-password'));
          } else {
            app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        } else if (response.success) {
          app.trigger('joinGroup', this.model.get('name'));
        }
      }, this));
    }, this));
  },
  initializeTooltips: function () {
    this.$('[data-toggle="tooltip"][data-type="room-mode"]').tooltip({
      container: 'body'
    });
    this.$('[data-toggle="tooltip"][data-type="room-users"]').tooltip({
      html: true,
      animation: false,
      container: 'body',
      template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner left" style="margin-top:3px;"></div></div>',
      title: function () {
        return '<div class="username" style="' + this.dataset.bgcolor + '">@' + this.dataset.username + '</div>';
      }
    });
  },
  changeColor: function () {
    if (this.model.get('focused')) {
      app.trigger('changeColor', this.model.get('color'));
    }
  },

  /**
   * Update group details methods
   */

  onColor: function (model, value, options) {
    this.onAvatar(model, model.get('avatar'), options);
    this.changeColor();
  },
  onAvatar: function (model, value) {
    var url = common.cloudinary.prepare(value, 100);
    this.$('img.avatar').attr('src', url);
  },
  refreshUsers: function () {
    this.groupUsersView.render();
  }
});

module.exports = GroupView;
