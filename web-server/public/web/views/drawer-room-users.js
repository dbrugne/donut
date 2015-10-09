var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var RoomUsersTableConfirmation = require('./drawer-room-users-table');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');

var DrawerRoomUsersView = Backbone.View.extend({
  template: require('../templates/drawer-room-users.html'),

  paginationTemplate: require('../templates/pagination.html'),

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
      this.types = _.without(this.types, 'allowed');
    } if (!isOwner && !isAdmin && !isOp) {
      this.types = _.without(this.types, 'ban', 'devoice');
    }

    this.$el.html(this.template({room: this.model.toJSON(), type: this.types}));
    this.numberUsers = this.$('.number');
    this.search = this.$('input[type=text]');
    this.pagination = this.$('.paginate');
    this.typeSelected = this.$('#type-select');
    this.$usersLabel = this.$('.user-label');

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
    this.$usersLabel.text(i18next.t('chat.users.users', {count: data.count}));
    this.pagination.html(this.paginationTemplate({
      currentPage: this.page,
      totalNbPages: Math.ceil(data.count / this.paginate),
      nbPages: 5
    }));

    this.initializeTooltips();
  },
  onChangeType: function () {
    this.page = 1;
    this.search.val('');
    this.currentType = this.typeSelected.val();
    this.render();
  },
  onSearch: function () {
    this.page = 1;
    this.render();
  },
  onSearchEnter: function (event) {
    var key = keyboard._getLastKeyCode(event);
    if (key.key === keyboard.RETURN) {
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
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerRoomUsersView;
