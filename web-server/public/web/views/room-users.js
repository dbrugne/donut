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

  initialize: function () {
    this.listenTo(this.collection, 'users-redraw', this.render);

    this.initialRender();
  },
  initialRender: function () {
    var html = this.template({});
    this.$el.html(html);
    this.$count = this.$el.find('.count');
    this.$list = this.$el.find('.list');
  },
  render: function () {
    debug.start('room-users' + this.model.get('name'));
    // update user count
    var countHtml = i18next.t('chat.userscount', {count: this.model.get('users_number')});
    this.$count.html(countHtml);

    // redraw user list
    var listJSON = [];
    var that = this;
    _.each(this.collection.models, function (o) {
      var u = o.toJSON();

      // avatar
      u.avatar = common.cloudinary.prepare(u.avatar, 34);
      u.uri = urls(u, 'user', null, null, 'uri');

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
    debug.end('room-users' + that.model.get('name'));
    return this;
  },
  _remove: function () {
    this.remove();
  }

});

module.exports = RoomUsersView;
