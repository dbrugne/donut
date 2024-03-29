var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var confirmationView = require('./modal-confirmation');
var date = require('../libs/date');

var DrawerRoomUsersTableView = Backbone.View.extend({
  template: require('../templates/drawer-room-access-table.html'),

  paginationTemplate: require('../templates/pagination.html'),

  page: 1, // Start on index 1

  paginate: 15, // Number of users display on a page

  nbPages: 0, // Store total number of pages

  events: {
    'click .accept-allow': 'onAllowUser',
    'click .refuse-allow': 'onRefuseUser',
    'click .disallow': 'onDisallow',
    'click .pagination>li>a': 'onChangePage'
  },

  initialize: function (options) {
    this.roomId = options.room_id;
    this.$ctn = this.$('.ctn');
    this.pagination = this.$('.paginate');

    this.listenTo(app, 'removeTooltips', this.onRemoveTooltips);
  },

  render: function (type) {
    var searchAttributes = {
      type: (type === 'pending' ? 'allowedPending' : 'allowed'),
      selector: {start: (this.page - 1) * this.paginate, length: this.paginate}
    };

    app.client.roomUsers(this.roomId, searchAttributes, _.bind(function (data) {
      this.onResponse(data);
    }, this));

    return this;
  },

  onResponse: function (data) {
    if (!data.users || !data.users.length || (data.users.length === 1 && data.users[0].isOwner)) {
      this.$el.hide();
      return;
    }

    this.$el.show();
    _.each(data.users, function (element, index, list) {
      list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
      element.date = date.shortDayMonthTime(element.date);
      element.message = _.escape(element.message);
    });

    this.$ctn.html(this.template({users: data.users, type: ''}));
    this.pagination.html(this.paginationTemplate({
      currentPage: this.page,
      totalNbPages: Math.ceil(data.count / this.paginate),
      nbPages: 5
    }));

    this.initializeTooltips();
    this.initializePopover();
  },

  onAllowUser: function (event) {
    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      confirmationView.open({message: 'accept-user', username: userName}, _.bind(function () {
        app.client.roomAccept(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
  },

  onRefuseUser: function (event) {
    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      confirmationView.open({message: 'refuse-user', username: userName}, _.bind(function () {
        app.client.roomRefuse(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
  },

  onDisallow: function (event) {
    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      confirmationView.open({message: 'disallow-user', username: userName}, _.bind(function () {
        app.client.roomDisallow(this.roomId, userId, _.bind(function (data) {
          app.trigger('redraw-tables');
        }, this));
      }, this));
    }
    this.$el.find('[data-toggle="tooltip"]').tooltip('hide');
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  initializePopover: function () {
    this.$el.find('[data-toggle="popover"]').popover({
      container: 'body'
    });
  },

  onRemoveTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip('hide');
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

module.exports = DrawerRoomUsersTableView;
