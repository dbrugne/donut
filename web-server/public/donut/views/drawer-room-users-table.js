'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, confirmationView, templates) {
  var DrawerRoomUsersTableView = Backbone.View.extend({
    template: templates['drawer-room-users-table.html'],

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
        client.roomOp(that.model.get('id'), userId, null);
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isOp = true;
          }
          return (u);
        });
        that.render(that.users);
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
        client.roomDeop(that.model.get('id'), userId, null);
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isOp = false;
          }
          return (u);
        });
        that.render(that.users);
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
        that.users = _.filter(that.users, function (u) {
          if (u.user_id !== userId) {
            return (u);
          }
        });
        that.render(that.users);
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
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isBanned = true;
          }
          return (u);
        });
        that.render(that.users);
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
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isBanned = false;
          }
          return (u);
        });
        that.render(that.users);
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
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isDevoiced = false;
          }
          return (u);
        });
        that.render(that.users);
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
        that.users = _.map(that.users, function (u) {
          if (u.user_id === userId) {
            u.isDevoiced = true;
          }
          return (u);
        });
        that.render(that.users);
      });
    },

    initializeTooltips: function () {
      $('[data-toggle="tooltip"]').tooltip();
    }
  });
  return DrawerRoomUsersTableView;
});
