var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var app = require('../libs/app');
var date = require('../libs/date');
var GroupUsersView = require('./group-users');
var CardsView = require('./cards');

var GroupView = Backbone.View.extend({
  template: require('../templates/group.html'),

  tagName: 'div',

  className: 'group',

  events: {
    'click .group-join': 'askMembership',
    'click .share .facebook': 'shareFacebook',
    'click .share .twitter': 'shareTwitter',
    'click .share .googleplus': 'shareGoogle',
    'click .toggle-collapse': 'toggleCollapse'
  },

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:avatar', this.onAvatar);
    this.listenTo(this.model, 'redraw', this.render);
    this.listenTo(app, 'askMembership', this.askMembership);
    this.render();
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));

    var what = {
      rooms: true,
      users: true,
      admin: true
    };

    app.client.groupRead(this.model.get('group_id'), what, _.bind(function (data) {
      if (data.err === 'group-not-found') {
        return;
      }
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (response) {
    // prepare avatar for group
    response.avatarUrl = common.cloudinary.prepare(response.avatar, 100);

    if (response.disclaimer) {
      response.disclaimer = _.escape(response.disclaimer);
    }

    var data = {
      isMember: response.is_member,
      isOp: response.is_op,
      isOwner: response.is_owner,
      isAdmin: app.user.isAdmin(),
      isBanned: response.i_am_banned,
      group: response,
      created: date.longDate(response.created)
    };
    if (response.i_am_banned) {
      data.banned_at = date.longDate(response.banned_at);
      data.reason = response.reason;
    }

    // populate owner / op / users avatars
    var users = {
      owner: {},
      op: [],
      members: []
    };

    var isAllowed = response.is_member || response.is_op || response.is_owner || app.user.isAdmin();
    _.each(data.group.members, _.bind(function (u) {
      if (u.is_owner || u.is_op || isAllowed) {
        var u2 = _.clone(u);
        u2.type = 'user';
      }
      u.avatar = common.cloudinary.prepare(u.avatar, 30);
      if (u.is_owner) {
        users.owner = u;
      } else if (u.is_op) {
        users.op.push(u);
      } else {
        users.members.push(u);
      }
    }, this));
    data.group_users = users;

    // share widget
    var share = 'share-group-' + this.model.get('id');
    this.share = {
      class: share,
      selector: '.' + share
    };
    data.share = this.share.class;

    var html = this.template(data);
    this.$el.html(html);

    var groupId = this.model.get('group_id');

    this.roomsView = new CardsView({
      el: this.$('.cards').find('.rooms'),
      type: 'rooms',
      loadData: function (skip, fn) {
        app.client.search({
          type: 'rooms',
          limit: 9,
          skip: skip,
          full: true,
          filter_on_group_id: groupId
        }, fn);
      }
    });

    this.usersView = new CardsView({
      el: this.$('.cards').find('.users'),
      type: 'users',
      loadData: function (skip, fn) {
        app.client.search({
          type: 'users',
          limit: 9,
          skip: skip,
          full: true,
          filter_on_group_id: groupId
        }, fn);
      }
    });

    if (!this.roomsView.loaded) {
      this.roomsView.load();
    }

    // detect click on tab to load group user at least one when needed (rooms are loaded by default just above)
    this.$('a[data-toggle="tab"]').on('show.bs.tab', _.bind(function (e) {
      if ($(e.target).data('type') === 'users') {
        if (!this.usersView.loaded) {
          this.usersView.load();
        }
      }
    }, this));

    this.groupUsersView = new GroupUsersView({
      el: this.$('.users.user-list'),
      model: this.model,
      data: response
    });
    this.groupUsersView.render();

    this.$headerBelow = this.$('.header-below');

    this.initializeTooltips();

    return this;
  },
  onShowTab: function (event) {
    console.log('onShowTab');
  },
  removeView: function () {
    this.groupUsersView._remove();
    this.roomsView._remove();
    this.usersView._remove();
    this.remove();
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.render();
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  askMembership: function () {
    app.client.groupBecomeMember(this.model.get('group_id'), null, _.bind(function (response) {
      if (response.err) {
        return app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
      if (!response.success) {
        app.trigger('openGroupJoin', this.model, response.options);
      } else {
        this.model.onRefresh();
      }
    }, this));
  },

  /**
   * Update group details methods
   */

  onAvatar: function (model, value) {
    var url = common.cloudinary.prepare(value, 100);
    this.$('.header img.avatar.group').attr('src', url);
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  toggleCollapse: function (event) {
    if (this.$headerBelow.hasClass('collapsed')) {
      this.$headerBelow.slideDown(300, function () {
        $(this).toggleClass('collapsed');
      });
    } else {
      this.$headerBelow.slideUp(300, function () {
        $(this).toggleClass('collapsed');
      });
    }
  },

  /**
   * Social sharing
   */
  shareFacebook: function () {
    $.socialify.facebook({
      url: this.model.getUrl(),
      name: i18next.t('chat.share.title', {name: this.model.get('name')}),
      picture: common.cloudinary.prepare(this.model.get('avatar'), 350),
      description: i18next.t('chat.share.description', {name: this.model.get('name')})
    });
  },
  shareTwitter: function () {
    $.socialify.twitter({
      url: this.model.getUrl(),
      text: i18next.t('chat.share.description', {name: this.model.get('name')})
    });
  },
  shareGoogle: function () {
    $.socialify.google({
      url: this.model.getUrl()
    });
  }
});

module.exports = GroupView;
