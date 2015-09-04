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

    currentType: 'all', // ['all', 'op', 'allowed', 'ban', 'devoice']

    events: {
      'click .all': 'onSelectAll',
      'click .Op': 'onSelectOp',
      'click .Allowed': 'onSelectAllowed',
      'click .Banned': 'onSelectBanned',
      'click .Devoiced': 'onSelectDevoiced',
      'keyup input[type=text]': 'onKeyUp',
      'click i.icon-search': 'onKeyUp'
    },

    initialize: function (options) {
      this.model = options.model;

      this.$el.html(this.template());
      this.roomName = this.$('.name');
      this.ownerName = this.$('.open-user-profile');
      this.numberUsers = this.$('.number');
      this.search = this.$('input[type=text]');

      this.tableView = new RoomUsersTableConfirmation({
        el: this.$('.table-users')
      });

      this.roomName.text(this.model.get('name'));
      this.ownerName.text('@' + this.model.get('owner').get('username'));
      this.ownerName.data('userId', this.model.get('owner').get('user_id'));

      this.render(null);
    },

    render: function () {
      // ask for data
      var that = this;
      client.roomUsers(this.model.get('id'), this.currentType, this.search.val(), {start: 0, length: this.paginate}, function (data) {
        that.onResponse(data);
      });
      return this;
    },
    onResponse: function (data) {
      this.tableView.render(data.users);
      this.numberUsers.text(data.nbUsers);
    },
    onSelectAll: function (event) {
      event.preventDefault();
      if (this.currentType !== 'all') {
        this.currentType = 'all';
        this.render();
      }
    },
    onSelectOp: function (event) {
      event.preventDefault();
      if (this.currentType !== 'op') {
        this.currentType = 'op';
        this.render();
      }
    },
    onSelectAllowed: function (event) {
      event.preventDefault();
      if (this.currentType !== 'allowed') {
        this.currentType = 'allowed';
        this.render();
      }
    },
    onSelectBanned: function (event) {
      event.preventDefault();
      if (this.currentType !== 'ban') {
        this.currentType = 'ban';
        this.render();
      }
    },
    onSelectDevoiced: function (event) {
      event.preventDefault();
      if (this.currentType !== 'devoice') {
        this.currentType = 'devoice';
        this.render();
      }
    },
    onKeyUp: function (event) {
      this.render();
    }
  });
  return DrawerRoomUsersView;
});
