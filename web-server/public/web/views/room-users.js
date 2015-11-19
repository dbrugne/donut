var $ = require('jquery');
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

  userPreviewTemplate: require('../templates/user-preview.html'),

  timeBuffer: 200,
  timeoutShow: 0,
  timeoutHide: 0,

  events: {
    'click .compact-mode': 'compact',
    'mouseenter .users > .list > li.li-user': 'fillPopin',
    'mouseleave .users > .list > li.li-user': 'hidePopin'
  },

  initialize: function () {
    this.listenTo(this.collection, 'users-redraw', this.render);

    this.$users = this.$('.users');
    this.$popinUsers = $('#popin-user');

    this.$popinUsers.mouseenter(_.bind(function () {
      clearTimeout(this.timeoutHide);
    }, this));
    this.$popinUsers.mouseleave(_.bind(function () {
      this.hidePopin();
    }, this));

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
  },
  fillPopin: function (event) {
    clearTimeout(this.timeoutShow);

    this.timeoutShow = setTimeout(_.bind(function () {
      var elt = $(event.currentTarget);
      if (!elt.data('user-id')) {
        return;
      }

      var offset = elt.offset();
      var user = this.collection.get(elt.data('user-id')).toJSON();
      user.avatar = common.cloudinary.prepare(user.avatar, 100);
      user.uri = urls(user, 'user', 'uri');

      var data = {
        user: user,
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp(),
        isAdmin: this.model.currentUserIsAdmin()
      };

      this.$popinUsers.html(this.userPreviewTemplate(data));
      this.$popinUsers.modal({backdrop: false});
      this.$popinUsers.css('left', (offset.left - this.$popinUsers.find('.modal-dialog').width()));
      this.$popinUsers.css('top', offset.top);

      this.$popinUsers.show();
    }, this), this.timeBuffer);
  },
  hidePopin: function () {
    clearTimeout(this.timeoutHide);
    this.timeoutHide = setTimeout(_.bind(function () {
      this.$popinUsers.hide();
    }, this), this.timeBuffer);
  }
});

module.exports = RoomUsersView;
