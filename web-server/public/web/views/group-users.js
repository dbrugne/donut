var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');

var GroupUsersView = Backbone.View.extend({
  template: require('../templates/group-users.html'),

  initialize: function (data) {
    this.response = data.data;
    this.listenTo(this.model, 'members-redraw', this.render);
    this.render();
  },
  render: function () {
    var isMember = this.response.is_member;
    var isOwner = this.response.is_owner;
    var isOp = this.response.is_op;
    var isAdmin = app.user.isAdmin();
    var op = [];
    var members = [];

    // prepare avatars for members & op
    _.each(this.response.members, function (u) {
      if (u.is_owner || u.is_op) {
        u.avatar = common.cloudinary.prepare(u.avatar, 60);
        op.push(u); // @todo limit the number of displayed op
      } else {
        if (isMember || isAdmin) {
          u.avatar = common.cloudinary.prepare(u.avatar, 34);
          members.push(u); // @todo limit the number of displayed members
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
      members_more: this.response.members_more,
      group_id: this.model.get('group_id')
    });
    this.$el.html(html);
    this.initializeTooltips();

    return this;
  },
  _remove: function () {
    this.remove();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = GroupUsersView;
