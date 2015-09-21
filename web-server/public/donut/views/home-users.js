var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common');

var UsersView = Backbone.View.extend({
  template: require('../templates/home-users.html'),

  initialize: function (options) {},
  render: function (data) {
    var users = [];
    _.each(data.users.list, function (user) {
      user.avatar = common.cloudinarySize(user.avatar, 30);
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

  initializeTooltips: function () {
    $('[data-toggle="tooltip"][data-type="room-users"]').tooltip({
      html: true,
      animation: false,
      container: 'body',
      template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner"></div></div>',
      title: function () {
        return '<div class="username" style="' + this.dataset.bgcolor + '">@' + this.dataset.username + '</div>';
      }
    });
  }
});


module.exports = UsersView;