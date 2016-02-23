var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../libs/app').user;
var date = require('../libs/date');
var urls = require('../../../../shared/util/url');

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
    app.client.groupRead(this.groupId, what, _.bind(function (data) {
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

    group.isOwner = (group.owner_id === currentUser.get('user_id'));
    group.isAdmin = app.user.isAdmin();
    group.isOp = !!_.find(group.members, function (item) {
      return (item.user_id === currentUser.get('user_id') && item.is_op === true);
    });
    group.avatar = common.cloudinary.prepare(group.avatar, 150);

    group.uri = urls(group, 'group', 'uri');
    group.url = urls(group, 'group', 'url');

    _.each(group.members, function (element, key, list) {
      element.avatar = common.cloudinary.prepare(element.avatar, 50);
    });

    var html = this.template({group: group, created_at: date.shortDate(group.created)});
    this.$el.html(html);

    this.initializeTooltips();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerGroupProfileView;
