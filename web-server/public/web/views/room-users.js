var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var donutDebug = require('../libs/donut-debug');
var urls = require('../../../../shared/util/url');
var debug = donutDebug('donut:room-users');
var currentUser = require('../libs/app').user;

var RoomUsersView = Backbone.View.extend({
  template: require('../templates/room-users.html'),
  templateSpinner: require('../templates/spinner.html'),

  listTemplate: require('../templates/room-users.html'),

  userPreviewTemplate: require('../templates/user-preview.html'),

  maxDisplayedUsers: 20,
  timeBuffer: 250,
  timeoutHide: 0,

  events: {
    'click .compact-mode': 'compact',
    'click li.li-user': 'fillPopin',
    'mouseleave li.li-user': 'hidePopin'
  },

  initialize: function () {
    this.listenTo(this.collection, 'users-redraw', this.render);
    this.listenTo(this.model, 'change:focused', this.onFocusChange);

    this.$users = this.$('.users');
    this.$popinUsers = $('#popin-user');

    this.$popinUsers.mouseenter(_.bind(function () {
      clearTimeout(this.timeoutHide);
    }, this));
    this.$popinUsers.mouseleave(_.bind(function () {
      this.hidePopin();
    }, this));

    this.$list = this.$users.find('.list');

    this.model.users.fetchUsers();
  },
  render: function () {
    debug.start('room-users' + this.model.get('name'));

    var models = this.collection.first(this.maxDisplayedUsers);

    // redraw user list
    var listJSON = [];
    var that = this;
    _.each(models, function (o) {
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
      isAdmin: app.user.isAdmin(),
      room_id: this.model.get('id')
    });
    this.$list.html(html);

    this.$count = this.$users.find('.count');
    var countHtml = i18next.t('chat.userscount', {count: this.collection.length});
    this.$count.html(countHtml);

    this.$('[data-toggle="tooltip"]').tooltip({container: 'body'});

    debug.end('room-users' + that.model.get('name'));
    return this;
  },
  _remove: function () {
    this.remove();
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      // @todo : need to reduce call to fetchUsers on dicussion focus
      this.collection.fetchUsers();
    }
  },
  compact: function () {
    this.$el.toggleClass('compact');
  },
  fillPopin: function (event) {
    clearTimeout(this.timeoutHide);

    var elt = $(event.currentTarget);
    if (!elt.data('user-id')) {
      return;
    }

    var offset = elt.offset();
    var user = this.collection.get(elt.data('user-id')).toJSON()
    user.avatar = common.cloudinary.prepare(user.avatar, 100);
    user.uri = urls(user, 'user', 'uri');

    var data = {
      user: user,
      room_id: this.model.get('id'),
      isCurrentUser: (user.id === currentUser.get('user_id')),
      isOwner: this.model.currentUserIsOwner(),
      isOp: this.model.currentUserIsOp(),
      isAdmin: app.user.isAdmin()
    };

    this.$popinUsers.html(this.userPreviewTemplate(data));
    this.$popinUsers.modal({backdrop: false});
    this.$popinUsers.css('left', (offset.left - this.$popinUsers.find('.modal-dialog').width()));
    this.$popinUsers.css('top', offset.top);

    this.$popinUsers.show();

    // Check if popin is out of bottom screen
    this.$popinUsers.removeClass('bottom');
    if (this.$popinUsers.position().top + this.$popinUsers.height() > this.$el.height()) {
      this.$popinUsers.addClass('bottom');
    }

    app.client.userRead(user.user_id, {more: true}, _.bind(function (user) {
      if (user.err) {
        return;
      }
      if (user.location) {
        this.$popinUsers.find('.location').removeClass('hidden').find('.ctn').html(user.location);
      }
    }, this));
  },
  hidePopin: function () {
    clearTimeout(this.timeoutHide);
    this.timeoutHide = setTimeout(_.bind(function () {
      this.$popinUsers.hide();
    }, this), this.timeBuffer);
  }
});

module.exports = RoomUsersView;
