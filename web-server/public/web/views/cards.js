var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var CardsView = Backbone.View.extend({
  templateGroup: require('../templates/card-group.html'),
  templateRoom: require('../templates/card-room.html'),
  templateUser: require('../templates/card-user.html'),
  events: {
    'click .load-more .btn': 'onLoadMore'
  },
  loaded: 0,
  initialize: function (options) {
    this.type = options.type;
    this.loadData = options.loadData || _.noop;
    this.render();
  },
  render: function (data) {
    this.$el.html(require('../templates/cards.html')({
      type: this.type,
      spinner: require('../templates/spinner.html')()
    }));
    this.$noResult = this.$('.no-result');
    this.$spinner = this.$('.spinner');
    this.$list = this.$('.list');
    this.$loadMore = this.$('.load-more');
    return this;
  },
  load: function () {
    this.loadData(this.loaded, _.bind(function (response) {
      this.add(response);
    }, this));
  },
  add: function (data) {
    this.show();
    this.$spinner.hide();
    if (!data.list || !data.list.length) {
      this.$noResult.show();
      this.$loadMore.hide();
      return;
    } else {
      this.$noResult.hide();
    }

    var html = '';
    _.each(data.list, _.bind(function (item, index, list) {
      item.avatar = common.cloudinary.prepare(item.avatar, 300);
      if (this.type === 'groups') {
        item.join = urls(item, 'group', 'uri');
        _.each(item.rooms, function (i) {
          i.avatar = common.cloudinary.prepare(i.avatar, 23);
        });
        html += this.templateGroup({card: item});
      } else if (this.type === 'rooms') {
        item.join = urls(item, 'room', 'uri');
        if (item.group_id) {
          item.group_avatar = common.cloudinary.prepare(item.group_avatar, 22);
        }
        if (item.mode === 'private') {
          item.private = 'private';
          if (item.allow_user_request) {
            item.private += '-invites';
          }
          if (item.allow_group_member) {
            item.private += '-group';
          }
        }
        html += this.templateRoom({card: item});
      } else if (this.type === 'users') {
        item.join = urls(item, 'user', 'uri');
        html += this.templateUser({card: item});
      }
    }, this));

    if (data.more === true) {
      this.$loadMore.show();
    } else {
      this.$loadMore.hide();
    }

    if (!this.loaded) {
      this.$list.html(html);
    } else {
      this.$list.append(html);
    }

    this._tooltips();
    this.loaded = this.loaded + data.list.length;
  },
  _remove: function () {
    this.remove();
  },
  _tooltips: function () {
    this.$('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },
  show: function () {
    this.$el.show();
  },
  hide: function () {
    this.$el.hide();
  },
  reset: function () {
    this.$spinner.show();
    this.$noResult.hide();
    this.$loadMore.hide();
    this.$list.html('');
    this.loaded = 0;
  },
  onLoadMore: function (event) {
    event.preventDefault();
    this.load();
  }
});

module.exports = CardsView;
