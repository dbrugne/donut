var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var ConfirmationView = require('./modal-confirmation');
var client = require('../libs/client');
var i18next = require('i18next-client');
var app = require('../models/app');

var GroupView = Backbone.View.extend({
  template: require('../templates/group.html'),

  templateCards: require('../templates/rooms-cards.html'),

  tagName: 'div',

  className: 'group',

  events: {
    'click .request-allowance': 'onRequestAllowance'
  },

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.render();
  },
  render: function () {
    var group = this.model.toJSON();
    var op = [];
    var members = [];
    var isMember = this.model.currentUserIsMember();
    var isOwner = this.model.currentUserIsOwner();
    var isAdmin = this.model.currentUserIsAdmin();

    // prepare avatars for members & op
    _.each(group.members, function (u) {
      if (u.is_owner || u.is_op) {
        u.avatar = common.cloudinary.prepare(u.avatar, 60);
        op.push(u);
      } else {
        if (isMember) {
          u.avatar = common.cloudinary.prepare(u.avatar, 34);
          members.push(u);
        }
      }
    });
    // prepare avatar for group
    group.avatarUrl = common.cloudinary.prepare(group.avatar, 160);
    // prepare room avatar & uri
    var rooms = [];
    _.each(group.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);
      room.owner_id = room.owner.user_id;
      room.owner_username = room.owner.username;
      if (room.group_id) {
        room.join = '#' + room.group_name + '/' + room.name;
      } else {
        room.join = room.name;
      }

      if (room.mode === 'public' || isMember) {
        rooms.push(room);
      }
    });
    var html = this.template({
      isMember: isMember,
      isOwner: isOwner,
      isAdmin: isAdmin,
      group: group,
      op: op,
      members: members
    });
    var htmlCards = this.templateCards({
      rooms: rooms,
      title: false,
      more: false,
      replace: false
    });
    this.$el.html(html);
    this.$cards = this.$('.ctn-results .rooms.cards .list');
    this.$cards.html(htmlCards);

    this.initializeTooltips();
    return this;
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  onRequestAllowance: function (event) {
    ConfirmationView.open({message: 'request-allowance-group', area: true, group_name: this.model.get('name')}, _.bind(function (message) {
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
  }

});

module.exports = GroupView;