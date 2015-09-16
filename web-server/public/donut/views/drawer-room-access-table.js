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
    template: templates['drawer-room-access-table.html'],

    events: {
      'click .accept-allow': 'onAllowUser',
      'click .refuse-allow': 'onRefuseUser',
      'click .disallow': 'onDisallow'
    },

    initialize: function (options) {
      this.model = options.model;
    },

    render: function (type) {
      if (type === 'pending') {
        client.roomUsers(this.model.get('id'), {type: 'allowedPending'}, _.bind(function (data) {
          this.onResponse(data.users);
        }, this));
      } else if (type === 'allowed') {
        client.roomUsers(this.model.get('id'), {type: 'allowed'}, _.bind(function (data) {
          this.onResponse(data.users);
        }, this));
      }
      return this;
    },

    onResponse: function (users) {
      _.each(users, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      this.$el.html(this.template({users: users}));

      this.initializeTooltips();
    },

    onAllowUser: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomAllow(this.model.get('id'), userId, true, _.bind(function (data) {
          this.model.trigger('redraw-tables');
          console.log('trigger redraw-tables');
        }, this));
      }
    },

    onRefuseUser: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomRefuse(this.model.get('id'), userId, _.bind(function (data) {
          this.model.trigger('redraw-tables');
          console.log('trigger redraw-tables');
        }, this));
      }
    },

    onDisallow: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomDisallow(this.model.get('id'), userId, _.bind(function (data) {
          this.model.trigger('redraw-tables');
          console.log('trigger redraw-tables');
        }, this));
      }
    },

    initializeTooltips: function () {
      $('[data-toggle="tooltip"]').tooltip();
    }
  });
  return DrawerRoomUsersTableView;
});
