var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var date = require('../libs/date');

var DrawerGroupProfileView = Backbone.View.extend({
  template: require('../templates/drawer-group-profile.html'),

  id: 'group-profile',

  events: {},

  initialize: function (options) {
    this.groupId = options.group_id;

    // show spinner as temp content
    this.render();

    if (options.data) {
      this.onResponse(options.data);
    }

    var what = {
      rooms: true,
      users: true,
      admin: true
    };
    client.groupRead(this.groupId, what, _.bind(function (data) {
      if (data.err === 'group-not-found') {
        return;
      }
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));

    return this;
  },
  onResponse: function (group) {
    if (!group.name) {
      return app.trigger('drawerClose');
    }

    group.isOwner = (group.owner && group.owner.user_id === currentUser.get('user_id'));

    group.isAdmin = currentUser.isAdmin();

    group.avatar = common.cloudinary.prepare(group.avatar, 90);

    group.uri = '#g/' + group.name;

    group.url = 'group/' + group.name;

    _.each(group.members, function (element, key, list) {
      element.avatar = common.cloudinary.prepare(element.avatar, 34);
    });

    var html = this.template({group: group});
    this.$el.html(html);
    date.from('date', this.$('.created span'));

    if (group.color) {
      this.trigger('color', group.color);
    }

    this.initializeTooltips();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"][data-type="room-users"]').tooltip({
      html: true,
      animation: false,
      container: 'body',
      template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner right"></div></div>',
      title: function () {
        return '<div class="username" style="' + this.dataset.bgcolor + '">@' + this.dataset.username + '</div>';
      }
    });
  }

});

module.exports = DrawerGroupProfileView;
