var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var donutDebug = require('../libs/donut-debug');
var urls = require('../../../../shared/util/url');
var debug = donutDebug('donut:room-users');

var RoomUsersView = Backbone.View.extend({
  template: require('../templates/room-users.html'),

  listTemplate: require('../templates/room-users-list.html'),

  events: {
    'click .compact-mode': 'compact'
  },

  initialize: function () {
    this.listenTo(this.collection, 'users-redraw', this.render);

    this.$users = this.$('.users');

    this.initialRender();
  },
  initialRender: function () {
    var html = this.template({});
    this.$users.html(html);
    this.$list = this.$users.find('.list');
  },
  render: function () {
    debug.start('room-users' + this.model.get('name'));

    // redraw user list
    var listJSON = [];
    var that = this;
    _.each(this.collection.models, function (o) {
      var u = o.toJSON();

      // avatar
      u.avatar = common.cloudinary.prepare(u.avatar, 34);
      u.uri = urls(u, 'user', 'uri');

      listJSON.push(u);
    });

    var html = this.listTemplate({
      list: listJSON,
      isOwner: this.model.currentUserIsOwner(),
      isOp: this.model.currentUserIsOp(),
      isAdmin: this.model.currentUserIsAdmin(),
      room_id: this.model.get('id')
    });
    this.$list.html(html);

    this.$count = this.$users.find('.count');
    var countHtml = i18next.t('chat.userscount', {count: this.model.get('users_number')});
    this.$count.html(countHtml);

    this.initializeTooltips();

    debug.end('room-users' + that.model.get('name'));
    return this;
  },
  _remove: function () {
    this.remove();
  },
  initializeTooltips: function () {
    this.$('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },
  compact: function () {
    this.$el.toggleClass('compact');
  }

});

module.exports = RoomUsersView;
