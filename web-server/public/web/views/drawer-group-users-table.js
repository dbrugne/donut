var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
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

    if (this.model.currentUserIsOwner() || this.model.currentUserIsOp() || this.model.currentUserIsAdmin()) {
      this.op = true;
    }
  },

  render: function (users) {
    this.users = users;

    _.each(users, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
    });

    this.$el.html(this.template({users: users, op: this.op, admin: this.model.currentUserIsAdmin()}));

    this.initializeTooltips();

    return this;
  },
  opUser: function (event) {
    event.preventDefault();
    if (!this.op) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.groupOp(that.model.get('id'), userId, function (err) {
        if (err) {
          return;
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
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.groupDeop(that.model.get('id'), userId, function (err) {
        if (err) {
          return;
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
      username: userName
    }, function (reason) {
      client.groupBan(that.model.get('id'), userId, reason, function() {
        that.trigger('redraw');
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
      client.groupDeban(that.model.get('id'), userId, function() {
        that.trigger('redraw');
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