var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var app = require('../models/app');
var confirmationView = require('./modal-confirmation');

var DrawerRoomUsersTableView = Backbone.View.extend({
  template: require('../templates/drawer-room-access-table.html'),

  events: {
    'click .accept-allow': 'onAllowUser',
    'click .refuse-allow': 'onRefuseUser',
    'click .disallow': 'onDisallow'
  },

  initialize: function (options) {
    this.roomId = options.room_id;
    this.listenTo(app, 'removeTooltips', this.onRemoveTooltips);
  },

  render: function (type) {
    if (type === 'pending') {
      client.roomUsers(this.roomId, {type: 'allowedPending'}, _.bind(function (data) {
        this.onResponse(data.users);
      }, this));
    } else if (type === 'allowed') {
      client.roomUsers(this.roomId, {type: 'allowed'}, _.bind(function (data) {
        this.onResponse(data.users);
      }, this));
    }
    this.$ctn = this.$('.ctn');
    return this;
  },

  onResponse: function (users) {
    if (!users.length) {
      this.$el.hide();
      return;
    }

    this.$el.show();
    _.each(users, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
    });

    this.$ctn.html(this.template({users: users}));

    this.initializeTooltips();
  },

  onAllowUser: function (event) {
    var userId = $(event.currentTarget).data('userId');

    if (userId) {
      confirmationView.open({}, _.bind(function () {
        client.roomAllow(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
  },

  onRefuseUser: function (event) {
    var userId = $(event.currentTarget).data('userId');

    if (userId) {
      confirmationView.open({}, _.bind(function () {
        client.roomRefuse(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
  },

  onDisallow: function (event) {
    var userId = $(event.currentTarget).data('userId');

    if (userId) {
      confirmationView.open({}, _.bind(function () {
        client.roomDisallow(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
    this.$el.find('[data-toggle="tooltip"]').tooltip('hide');
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  onRemoveTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip('hide');
  }
});

module.exports = DrawerRoomUsersTableView;
