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

    events: {
      'click .op': 'opUser',
      'click .deop': 'deopUser',
      'click .kick': 'kickUser',
      'click .ban': 'banUser',
      'click .deban': 'debanUser',
      'click .voice': 'voiceUser',
      'click .devoice': 'voiceUser'
    },

    initialize: function (options) {
      this.model = options.model;

      if (this.model.currentUserIsOwner() || this.model.currentUserIsOp() || this.model.currentUserIsAdmin()) {
        this.op = true;
      }
    },

    render: function (users) {
      _.each(users, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      this.$el.html(this.template({users: users, op: this.op}));
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
        that.render();
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
        that.render();
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
        that.render();
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
        that.render();
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
        that.render();
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
        that.render();
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
        that.render();
      });
    }
  });
  return DrawerRoomUsersTableView;
});
