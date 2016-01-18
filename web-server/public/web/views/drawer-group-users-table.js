var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var confirmationView = require('./modal-confirmation');

var DrawerGroupUsersTableView = Backbone.View.extend({
  template: require('../templates/drawer-group-users-table.html'),

  op: false,

  users: [],

  events: {
    'click .op': 'opUser',
    'click .deop': 'deopUser',
    'click .ban': 'banUser',
    'click .deban': 'debanUser'
  },

  initialize: function (options) {
    this.model = options.model;
  },

  render: function (users, currentUserInfos) {
    this.users = users;
    this.op = (currentUserInfos.is_owner || currentUserInfos.is_op || this.model.currentUserIsAdmin());

    _.each(users, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
    });

    this.$el.html(this.template({
      users: users,
      op: this.op,
      admin: this.model.currentUserIsAdmin()
    }));

    this.initializeTooltips();

    return this;
  },
  opUser: function (event) {
    event.preventDefault();
    if (!this.op) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');
    if (!userId || !userName) {
      return;
    }

    var that = this;
    confirmationView.open({
      message: 'op-group-user',
      username: userName
    }, function () {
      app.client.groupOp(that.model.get('id'), userId, function (response) {
        if (!response.err) {
          that.trigger('redraw');
          that.model.onRefresh();
        }
      });
    });
  },
  deopUser: function (event) {
    event.preventDefault();
    if (!this.op) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');
    if (!userId || !userName) {
      return;
    }

    var that = this;
    confirmationView.open({
      message: 'deop-group-user',
      username: userName
    }, function () {
      app.client.groupDeop(that.model.get('id'), userId, function (response) {
        if (!response.err) {
          that.trigger('redraw');
          that.model.onRefresh();
        }
      });
    });
  },
  banUser: function (event) {
    event.preventDefault();
    if (!this.op) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');
    if (!userId || !userName) {
      return;
    }

    var that = this;
    confirmationView.open({
      message: 'ban-group-user',
      username: userName,
      input: true
    }, function (reason) {
      app.client.groupBan(that.model.get('id'), userId, reason, function (response) {
        if (!response.err) {
          that.trigger('redraw');
          that.model.onRefresh();
        }
      });
    });
  },
  debanUser: function (event) {
    event.preventDefault();
    if (!this.op) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');
    if (!userId || !userName) {
      return;
    }

    var that = this;
    confirmationView.open({
      message: 'deban-group-user',
      username: userName
    }, function () {
      app.client.groupDeban(that.model.get('id'), userId, function (response) {
        if (!response.err) {
          that.trigger('redraw');
          that.model.onRefresh();
        }
      });
    });
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerGroupUsersTableView;
