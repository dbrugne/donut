var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');

var HomeView = Backbone.View.extend({
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

    _.each(group.members, function (u) { // prepare avatars
      if (u.is_owner || u.is_op) {
        u.avatar = common.cloudinary.prepare(u.avatar, 60);
        op.push(u);
      } else {
        u.avatar = common.cloudinary.prepare(u.avatar, 34);
        members.push(u);
      }
    });
    group.avatarUrl = common.cloudinary.prepare(group.avatar, 80);
    var html = require('../templates/group.html')({group: group, op: op, members: members});
    this.$el.html(html);

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

module.exports = HomeView;
