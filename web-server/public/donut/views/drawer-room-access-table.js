'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/app',
  'models/current-user',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, common, client, app, currentUser, confirmationView, templates) {
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
        client.roomUsers(this.model.id, {type: 'allowedPending'}, _.bind(function (data) {
          this.onResponse(data.users);
        }, this));
      } else if (type === 'allowed') {
        client.roomUsers(this.model.id, {type: 'allowed'}, _.bind(function (data) {
          this.onResponse(data.users);
        }, this));
      }
      this.$ctn = this.$el.find('.ctn');
      return this;
    },

    onResponse: function (users) {
      if (users.length === 0) {
        this.$el.hide();
        return;
      }

      this.$el.show();
      _.each(users, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      this.$ctn.html(this.template({users: users}));

      this.initializeTooltips();
    },

    onAllowUser: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomAllow(this.model.id, userId, true, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }
    },

    onRefuseUser: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomRefuse(this.model.id, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }
    },

    onDisallow: function (event) {
      var userId = $(event.currentTarget).data('userId');

      if (userId) {
        client.roomDisallow(this.model.id, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }
    },

    initializeTooltips: function () {
      $('[data-toggle="tooltip"]').tooltip();
    }
  });
  return DrawerRoomUsersTableView;
});
