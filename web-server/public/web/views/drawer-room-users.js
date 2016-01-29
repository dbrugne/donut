var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var RoomUsersTableConfirmation = require('./drawer-room-users-table');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var currentUser = require('../libs/app').user;

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
    this.roomId = options.room_id;

    this.listenTo(app.client, 'room:ban', this.render);
    this.listenTo(app.client, 'room:deban', this.render);
    this.listenTo(app.client, 'room:voice', this.render);
    this.listenTo(app.client, 'room:devoice', this.render);
    this.listenTo(app.client, 'room:kick', this.render);
    this.listenTo(app.client, 'room:op', this.render);
    this.listenTo(app.client, 'room:deop', this.render);

    this.reload();
  },

  reload: function () {
    var what = {
      more: true,
      users: true,
      admin: true
    };
    app.client.roomRead(this.roomId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },

  onResponse: function (data) {
    data.isOwner = currentUser.get('user_id') === data.owner_id;
    data.isAdmin = currentUser.get('admin');
    data.isOp = data.ops.indexOf(currentUser.get('user_id')) !== -1;

    if (data.mode !== 'private' || (!data.isOwner && !data.isAdmin && !data.isOp)) {
      this.types = _.without(this.types, 'allowed');
    } if (!data.isOwner && !data.isAdmin && !data.isOp) {
      this.types = _.without(this.types, 'ban', 'devoice');
    }

    this.$el.html(this.template({room: data, type: this.types}));
    this.numberUsers = this.$('.number');
    this.search = this.$('input[type=text]');
    this.pagination = this.$('.paginate');
    this.typeSelected = this.$('#type-select');
    this.$usersLabel = this.$('.user-label');

    this.tableView = new RoomUsersTableConfirmation({
      el: this.$('.table-users'),
      data: data
    });

    this.render();
  },

  render: function () {
    // ask for data
    var that = this;
    var searchAttributes = {
      type: this.currentType,
      searchString: this.search.val(),
      selector: {start: (this.page - 1) * this.paginate, length: this.paginate}
    };
    app.client.roomUsers(this.roomId, searchAttributes, function (data) {
      that.onResponseUser(data);
    });
    return this;
  },
  onResponseUser: function (data) {
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
    var key = keyboard.getLastKeyCode(event);
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
