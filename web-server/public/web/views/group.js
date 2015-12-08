var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
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
    'click .group-join': 'askMembership'
  },

  initialize: function (options) {
    this.listenTo(this.model, 'refreshPage', this.onRefreshPage);
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'change:color', this.onColor);
    this.listenTo(this.model, 'redraw', this.render);
    this.listenTo(app, 'askMembership', this.askMembership);
  },
  render: function () {
    var group = this.model.toJSON();
    var isMember = this.model.currentUserIsMember();
    var isOwner = this.model.currentUserIsOwner();
    var isOp = this.model.currentUserIsOp();
    var isAdmin = this.model.currentUserIsAdmin();

    console.log(isAdmin);

    this.bannedObject = this.model.currentUserIsBanned();

    // prepare avatar for group
    group.avatarUrl = common.cloudinary.prepare(group.avatar, 160);
    // prepare room avatar & uri
    var rooms = [];
    _.each(group.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);
      if (room.owner) {
        room.owner_id = room.owner.user_id;
        room.owner_username = room.owner.username;
      }
      room.group_id = group.group_id;
      room.group_name = group.name;
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
      isBanned: !!this.bannedObject,
      group: group,
      created: date.longDate(group.created)
    };
    if (typeof this.bannedObject !== 'undefined') {
      data.banned_at = date.longDate(this.bannedObject.banned_at);
      data.reason = this.bannedObject.reason;
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
      model: this.model
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
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  askMembership: function () {
    client.groupJoin(this.model.get('group_id'), null, _.bind(function (response) {
      if (response.err) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      if (!response.success) {
        app.trigger('openGroupJoin', response.options);
      } else {
        app.trigger('alert', 'info', i18next.t('group.default-member'));
        app.trigger('joinGroup', {name: this.model.get('name'), popin: false});
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
  },
  onRefreshPage: function () {
    client.groupRead(this.model.get('group_id'), { users: true, rooms: true }, _.bind(function (response) {
      if (!response.err) {
        this.model.set(response);
        this.model.set('rooms', response.rooms);
        this.render();
      }
    }, this));
  }
});

module.exports = GroupView;
