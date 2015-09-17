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

    types: ['users', 'op', 'allowed', 'ban', 'devoice'],

    events: {
      'change select': 'onChangeType',
      'click i.icon-search': 'onSearch',
      'keyup input[type=text]': 'onSearchEnter',
      'click .pagination>li>a': 'onChangePage'
    },

    initialize: function (options) {
      this.model = options.model;

      this.listenTo(client, 'room:ban', this.render);
      this.listenTo(client, 'room:deban', this.render);
      this.listenTo(client, 'room:voice', this.render);
      this.listenTo(client, 'room:devoice', this.render);
      this.listenTo(client, 'room:kick', this.render);
      this.listenTo(client, 'room:op', this.render);
      this.listenTo(client, 'room:deop', this.render);

      var isOwner = this.model.currentUserIsOwner();
      var isOp = this.model.currentUserIsOp();
      var isAdmin = this.model.currentUserIsAdmin();

      if (this.model.get('mode') !== 'private' || (!isOwner && !isAdmin && !isOp)) {
        this.types = _.without(this.types, 'private');
      } if (!isOwner && !isAdmin && !isOp) {
        this.types = _.without(this.types, 'ban', 'devoice');
      }

      this.$el.html(this.template({room: this.model.toJSON(), owner: this.model.get('owner').toJSON(), type: this.types}));
      this.numberUsers = this.$el.find('.number');
      this.search = this.$el.find('input[type=text]');
      this.pagination = this.$el.find('.paginate');
      this.typeSelected = this.$el.find('#type-select');

      this.tableView = new RoomUsersTableConfirmation({
        el: this.$('.table-users'),
        model: this.model
      });

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
      this.numberUsers.text(data.count);
      this.pagination.html(this.paginationTemplate({
        currentPage: this.page,
        totalNbPages: Math.ceil(data.count / this.paginate),
        nbPages: 5
      }));

      this.initializeTooltips();
    },
    onChangeType: function (event) {
      this.page = 1;
      this.search.val('');
      this.currentType = this.typeSelected.val();
      this.render();
    },
    onSearch: function (event) {
      this.page = 1;
      this.render();
    },
    onSearchEnter: function (event) {
      if (event.keyCode === 13) {
        this.page = 1;
        this.render();
      }
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
    },

    initializeTooltips: function () {
      this.$el.find('[data-toggle="tooltip"]').tooltip();
    }
  });
  return DrawerRoomUsersView;
});
