var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var donutDebug = require('../libs/donut-debug');
var debug = donutDebug('donut:group-users');
var app = require('../models/app');

var GroupUsersView = Backbone.View.extend({
  template: require('../templates/group-users.html'),

  initialize: function (data) {
    this.listenTo(this.model, 'members-redraw', this.render);
    this.render();
  },
  render: function () {
    debug.start('group-users' + this.model.get('name'));

    var isMember = this.model.currentUserIsMember();
    var isOwner = this.model.currentUserIsOwner();
    var isOp = this.model.currentUserIsOp();
    var isAdmin = this.model.currentUserIsAdmin();
    var group = this.model.toJSON();
    var op = [];
    var members = [];

    // prepare avatars for members & op
    _.each(this.collection, function (u) {
      if (u.is_owner || u.is_op) {
        u.avatar = common.cloudinary.prepare(u.avatar, 60);
        op.push(u);
      } else {
        if (isMember || isAdmin) {
          u.avatar = common.cloudinary.prepare(u.avatar, 34);
          members.push(u);
        }
      }
    });

    var html = this.template({
      isMember: isMember,
      isOp: isOp,
      isOwner: isOwner,
      isAdmin: isAdmin,
      op: op,
      members: members,
      members_more: group.members_more,
      group_id: this.model.get('group_id')
    });
    this.$el.html(html);

    debug.end('group-users' + this.model.get('name'));
    return this;
  },
  _remove: function () {
    this.remove();
  }

});

module.exports = GroupUsersView;
