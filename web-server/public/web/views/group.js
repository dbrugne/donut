var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
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
    'click .group-join': 'askMembership'
  },

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'redraw', this.render);
    this.listenTo(app, 'askMembership', this.askMembership);
    this.render();
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));

    var what = {
      rooms: true,
      users: true,
      admin: true
    };

    app.client.groupRead(this.model.get('group_id'), what, _.bind(function (data) {
      if (data.err === 'group-not-found') {
        return;
      }
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (response) {
    // prepare avatar for group
    response.avatarUrl = common.cloudinary.prepare(response.avatar, 160);
    // prepare room avatar & uri
    var rooms = [];
    _.each(response.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);
      if (room.owner) {
        room.owner_id = room.owner.user_id;
        room.owner_username = room.owner.username;
      }
      room.group_id = response.group_id;
      room.group_name = response.name;
      room.join = urls(room, 'room', 'uri');
      room.type = 'room';
      rooms.push(room);
    });
    if (response.disclaimer) {
      response.disclaimer = _.escape(response.disclaimer);
    }
    var data = {
      isMember: response.is_member,
      isOp: response.is_op,
      isOwner: response.is_owner,
      isAdmin: app.user.isAdmin(),
      isBanned: response.i_am_banned,
      group: response,
      created: date.longDate(response.created)
    };
    if (response.i_am_banned) {
      data.banned_at = date.longDate(response.banned_at);
      data.reason = response.reason;
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
      el: this.$('.users.user-list'),
      model: this.model,
      data: response
    });
    this.groupUsersView.render();

    return this;
  },
  removeView: function () {
    this.groupUsersView._remove();
    this.cardsView._remove();
    this.remove();
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.render();
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  askMembership: function () {
    app.client.groupBecomeMember(this.model.get('group_id'), null, _.bind(function (response) {
      if (response.err) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      if (!response.success) {
        app.trigger('openGroupJoin', response.options);
      } else {
        app.trigger('alert', 'info', i18next.t('group.default-member'));
        app.trigger('joinGroup', this.model.get('identifier'));
      }
    }, this));
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
  }
});

module.exports = GroupView;
