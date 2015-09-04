'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  'views/drawer-room-users-table',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, confirmationView, RoomUsersTableConfirmation, templates) {
  var DrawerRoomUsersView = Backbone.View.extend({
    template: templates['drawer-room-users.html'],

    id: 'room-users',

    page: 1, // Start on index 1

    paginate: 15, // Number of users display on a page

    nbPages: 0, // Store total number of pages

    events: {},

    initialize: function (options) {
      this.model = options.model;

      this.$el.html(this.template());
      this.roomName = this.$('.name');
      this.ownerName = this.$('.open-user-profile');
      this.numberUsers = this.$('.number');
      this.tableView = new RoomUsersTableConfirmation({
        el: this.$('.table-users')
      });

      this.roomName.text(this.model.get('name'));
      this.ownerName.text('@' + this.model.get('owner').get('username'));
      this.ownerName.data('userId', this.model.get('owner').get('user_id'));

      this.firstRender();
    },

    firstRender: function () {
      // ask for data
      var that = this;
      client.roomUsers(this.model.get('id'), 'all', null, {start: 0, length: this.paginate}, function (data) {
        that.onResponse(data);
      });
      return this;
    },
    onResponse: function (data) {
      this.tableView.render(data.users);
      this.numberUsers.text(data.nbUsers);
    }
  });
  return DrawerRoomUsersView;
});
