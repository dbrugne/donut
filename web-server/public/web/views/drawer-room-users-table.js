var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
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
    this.data = options.data;
    if (this.data.isOwner || this.data.isOp || this.data.isAdmin) {
      this.op = true;
    }
  },

  render: function (users) {
    this.users = users;

    _.each(users, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
    });

    this.$el.html(this.template({users: users, op: this.op}));

    this.initializeTooltips();

    return this;
  },
  opUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomOp(that.data.room_id, userId, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  deopUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDeop(that.data.room_id, userId, function (err) {
        if (err) {
          return;
        }
      });
    });
  },
  kickUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({ input: true }, function (reason) {
      client.roomKick(that.data.room_id, userId, reason);
    });
  },
  banUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({ input: true }, function (reason) {
      client.roomBan(that.data.room_id, userId, reason);
    });
  },
  debanUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDeban(that.data.room_id, userId);
    });
  },
  voiceUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomVoice(that.data.room_id, userId);
    });
  },
  devoiceUser: function (event) {
    event.preventDefault();
    if (!this.data.isOwner && !this.data.isOp && !this.data.isAdmin) {
      return false;
    }

    var userId = $(event.currentTarget).data('userId');
    if (!userId) {
      return;
    }

    var that = this;
    confirmationView.open({}, function () {
      client.roomDevoice(that.data.room_id, userId);
    });
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerRoomUsersTableView;
