var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var date = require('../libs/date');
var urls = require('../../../../shared/util/url');

var DrawerUserProfileView = Backbone.View.extend({
  template: require('../templates/drawer-user-profile.html'),

  id: 'user-profile',

  events: {},

  initialize: function (options) {
    this.userId = options.user_id;

    this.listenTo(app, 'userDeban', this.onUserBanChange);
    this.listenTo(app, 'userBan', this.onUserBanChange);

    // show spinner as temp content
    this.render();

    if (options.data) {
      this.onResponse(options.data);
      return;
    }

    var that = this;
    client.userRead(this.userId, function (data) {
      if (data.err === 'user-not-found') {
        return;
      }
      if (!data.err) {
        that.onResponse(data);
      }
    });
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (user) {
    if (!user.username) {
      return app.trigger('drawerClose');
    }

    user.isCurrent = (user.user_id === currentUser.get('user_id'));
    user.avatar = common.cloudinary.prepare(user.avatar, 90);
    user.uri = urls(user, 'user', 'uri');

    this._rooms(user); // decorate user object with rooms_list

    var html = this.template({user: user});
    this.$el.html(html);
    date.from('date', this.$('.created span'));
    date.from('fromnow', this.$('.onlined span'));

    if (user.color) {
      this.trigger('color', user.color);
    }

    this.initializeTooltips();
  },
  /**
   * Construct the user room list for profile displaying
   * For each set name, avatar and color
   * @param user
   * @private
   */
  _rooms: function (user) {
    user.rooms_list = [];

    if (!user.rooms) {
      return;
    }

    var alreadyIn = [];

    function pushNew (room, owned, oped) {
      if (!room.name) {
        return;
      }

      if (alreadyIn.indexOf(room.name) !== -1) {
        return;
      } else {
        alreadyIn.push(room.name);
      }

      if (owned === true) {
        room.owned = true;
      }

      if (oped === true) {
        room.oped = true;
      }

      room.avatar = common.cloudinary.prepare(room.avatar, 40);

      user.rooms_list.push(room);
    }

    if (user.rooms.owned && user.rooms.owned.length > 0) {
      _.each(user.rooms.owned, function (room) {
        pushNew(room, true, false);
      });
    }

    if (user.rooms.oped && user.rooms.oped.length > 0) {
      _.each(user.rooms.oped, function (room) {
        pushNew(room, false, true);
      });
    }

    if (user.rooms.joined && user.rooms.joined.length > 0) {
      _.each(user.rooms.joined, function (room) {
        pushNew(room, false, false);
      });
    }
  },
  onUserBanChange: function () {
    this.render();
    client.userRead(this.userId, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"][data-type="rooms"]').tooltip({
      html: true,
      animation: false,
      container: 'body',
      template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner right"></div></div>',
      title: function () {
        return '<div class="username" style="' + this.dataset.bgcolor + '">' + this.dataset.username + '</div>';
      }
    });
  }

});


module.exports = DrawerUserProfileView;