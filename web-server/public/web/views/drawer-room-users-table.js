var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common');
var client = require('../client');
var currentUser = require('../models/current-user');
var confirmationView = require('./modal-confirmation');

var DrawerRoomUsersTableView = Backbone.View.extend({
  template: require('../templates/drawer-room-users-table.html'),

  op: false,

  users: [],

  events: {
    'click .op': 'opUser',
    'click .deop': 'deopUser',
    'click .kick': 'kickUser',
    'click .ban': 'banUser',
    'click .deban': 'debanUser',
    'click .voice': 'voiceUser',
    'click .devoice': 'devoiceUser'
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
      list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
    });

    this.$el.html(this.template({users: users, op: this.op}));

    this.initializeTooltips();

    return this;
  },
  opUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomOp(that.model.get('id'), userId, null, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  deopUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDeop(that.model.get('id'), userId, null, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  kickUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({ input: true }, function (reason) {
      client.roomKick(that.model.get('id'), userId, null, reason);
    });
  },
  banUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({ input: true }, function (reason) {
      client.roomBan(that.model.get('id'), userId, null, reason);
    });
  },
  debanUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDeban(that.model.get('id'), userId, null);
    });
  },
  voiceUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomVoice(that.model.get('id'), userId, null);
    });
  },
  devoiceUser: function (event) {
    event.preventDefault();
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDevoice(that.model.get('id'), userId, null);
    });
  },

  initializeTooltips: function () {
    $('[data-toggle="tooltip"]').tooltip();
  }
});

module.exports = DrawerRoomUsersTableView;