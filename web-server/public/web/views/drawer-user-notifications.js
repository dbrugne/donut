var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var date = require('../libs/date');
var urls = require('../../../../shared/util/url');

var DrawerUserProfileView = Backbone.View.extend({
  template: require('../templates/drawer-user-notifications.html'),

  id: 'user-profile',

  events: {},

  initialize: function (options) {
    this.userId = options.user_id;

    // show spinner as temp content
    this.render();

    //if (options.data) {
    //  this.onResponse(options.data);
    //  return;
    //}
    //
    //var that = this;
    //client.userRead(this.userId, function (data) {
    //  if (data.err === 'user-not-found') {
    //    return;
    //  }
    //  if (!data.err) {
    //    that.onResponse(data);
    //  }
    //});
  },
  render: function () {
    // render spinner only
    //this.$el.html(require('../templates/spinner.html'));
    this.$el.html(this.template);
    return this;
  },
  onResponse: function (user) {
    //if (!user.username) {
    //  return app.trigger('drawerClose');
    //}
    //
    //user.isCurrent = (user.user_id === currentUser.get('user_id'));
    //user.avatar = common.cloudinary.prepare(user.avatar, 90);
    //user.uri = urls(user, 'user', 'uri');
    //
    //this._rooms(user); // decorate user object with rooms_list
    //
    //var html = this.template({user: user});
    //this.$el.html(html);
    //date.from('date', this.$('.created span'));
    //date.from('fromnow', this.$('.onlined span'));
    //
    //if (user.color) {
    //  this.trigger('color', user.color);
    //}
    //
    //this.initializeTooltips();
  },
  initializeTooltips: function () {
    //this.$el.find('[data-toggle="tooltip"][data-type="rooms"]').tooltip({
    //  html: true,
    //  animation: false,
    //  container: 'body',
    //  template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner right"></div></div>',
    //  title: function () {
    //    return '<div class="username" style="' + this.dataset.bgcolor + '">' + this.dataset.username + '</div>';
    //  }
    //});
  }

});

module.exports = DrawerUserProfileView;
