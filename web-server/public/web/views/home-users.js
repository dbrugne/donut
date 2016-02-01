var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');

var UsersView = Backbone.View.extend({
  template: require('../templates/home-users.html'),

  initialize: function (options) {
  },
  render: function (data) {
    var users = [];
    _.each(data.users.list, function (user) {
      user.avatar = common.cloudinary.prepare(user.avatar, 30);
      users.push(user);
    });

    var html = this.template({
      users: users,
      more: data.users.more,
      search: data.search
    });
    this.$el.html(html);

    this.initializeTooltips();

    return this;
  },

  count: function () {
    return this.$('.list .item').length;
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = UsersView;
