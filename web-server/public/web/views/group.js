var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');

var GroupView = Backbone.View.extend({
  template: require('../templates/group.html'),

  templateCards: require('../templates/rooms-cards.html'),

  tagName: 'div',

  className: 'group',

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.render();
  },
  render: function () {
    var group = this.model.toJSON();
    var op = [];
    var members = [];

    // prepare avatars for members & op
    _.each(group.members, function (u) {
      if (u.is_owner || u.is_op) {
        u.avatar = common.cloudinary.prepare(u.avatar, 60);
        op.push(u);
      } else {
        u.avatar = common.cloudinary.prepare(u.avatar, 34);
        members.push(u);
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
        room.join = '#' + room.group_name + '/' + room.name.replace('#', '');
      } else {
        room.join = room.name;
      }

      rooms.push(room);
    });
    var html = this.template({
      group: group,
      op: op,
      members: members
    });
    var htmlCards = this.templateCards({
      rooms: rooms,
      title: false,
      more: false,
      replace: true
    });
    this.$el.html(html);
    this.$cards = this.$('.ctn-results .rooms.cards');
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
