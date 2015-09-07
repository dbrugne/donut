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

    paginationTemplate: templates['pagination.html'],

    id: 'room-users',

    page: 1, // Start on index 1

    paginate: 15, // Number of users display on a page

    nbPages: 0, // Store total number of pages

    currentType: 'users',

    types: ['Users', 'Op', 'Allowed', 'Ban', 'Devoice'],

    events: {
      'change select': 'onChangeType',
      'click i.icon-search': 'onSearch',
      'click .pagination>li>a': 'onChangePage'
    },

    initialize: function (options) {
      this.model = options.model;

      var isOwner = this.model.currentUserIsOwner();
      var isOp = this.model.currentUserIsOp();
      var isAdmin = this.model.currentUserIsAdmin();

      if (this.model.get('join_mode') !== 'allowed' || (!isOwner && !isAdmin && !isOp)) {
        this.types = _.without(this.types, 'Allowed');
      }
      if (!isOwner && !isAdmin && !isOp) {
        this.types = _.without(this.types, 'Ban', 'Devoice');
      }

      this.$el.html(this.template({type: this.types}));
      this.roomName = this.$('.name');
      this.ownerName = this.$('.open-user-profile');
      this.numberUsers = this.$('.number');
      this.search = this.$('input[type=text]');
      this.pagination = this.$('.paginate');
      this.typeSelected = this.$('#type-select');

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
      var searchAttributes = {
        type: this.currentType,
        searchString: this.search.val(),
        selector: {start: (this.page - 1) * this.paginate, length: this.paginate}
      };
      client.roomUsers(this.model.get('id'), searchAttributes, function (data) {
        that.onResponse(data);
      });
      return this;
    },
    onResponse: function (data) {
      this.tableView.render(data.users);
      this.numberUsers.text(data.nbUsers);
      this.pagination.html(this.paginationTemplate({
        currentPage: this.page,
        totalNbPages: Math.ceil(data.nbUsers / this.paginate),
        nbPages: 5
      }));
    },
    onChangeType: function (event) {
      this.page = 1;
      this.search.val('');
      if (this.typeSelected.val() === 'Users') {
        this.currentType = 'users';
      } else if (this.typeSelected.val() === 'Op') {
        this.currentType = 'op';
      } else if (this.typeSelected.val() === 'Allowed') {
        this.currentType = 'allowed';
      } else if (this.typeSelected.val() === 'Ban') {
        this.currentType = 'ban';
      } else if (this.typeSelected.val() === 'Devoice') {
        this.currentType = 'devoice';
      }
      this.render();
    },
    onSearch: function (event) {
      this.page = 1;
      this.render();
    },
    onChangePage: function (event) {
      event.preventDefault();

      var id = $(event.currentTarget).data('identifier');
      if (!id) {
        return;
      }

      if (id === 'previous') {
        this.page -= 1;
      } else if (id === 'next') {
        this.page += 1;
      } else {
        this.page = parseInt(id, 10);
      }
      this.render();
    }
  });
  return DrawerRoomUsersView;
});
