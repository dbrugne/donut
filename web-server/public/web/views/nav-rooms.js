var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');

module.exports = Backbone.View.extend({
  el: $('#rooms'),

  template: require('../templates/nav-rooms.html'),

  events: {
    'click .more': 'onToggleCollapse',
    'click .less': 'onToggleCollapse'
  },

  toggleCount: 4,

  initialize: function () {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationRooms', this.render);
    this.listenTo(app, 'nav-active', this.highlightFocused);

    this.listenTo(app.rooms, 'change:unviewed', this.onUnviewedChange);

    this.$list = this.$('.list');
  },
  render: function () {
    if (!this.filterRooms().length) {
      this.$list.empty();
      this.$el.addClass('empty');
      return;
    } else {
      this.$el.removeClass('empty');
    }

    var dataRooms = [];
    _.each(this.filterRooms(), function (o) {
      var json = o.toJSON();
      dataRooms.push(json);
    });

    var html = this.template({
      listRooms: dataRooms,
      toggleCount: this.toggleCount
    });
    this.$list.html(html);

    return this;
  },
  onToggleCollapse: function (event) {
    $(event.currentTarget).parents('.list').toggleClass('collapsed');
  },
  highlightFocused: function () {
    var that = this;
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
    });
    _.find(this.filterRooms(), function (room) {
      if (room.get('focused') === true) {
        that.$list.find('[data-room-id="' + room.get('id') + '"]').addClass('active');
        return true;
      }
    });
  },
  // Only keep rooms that are not in a group
  filterRooms: function () {
    return _.filter(app.rooms.models, function (room) {
      return !room.get('group_id');
    });
  },
  onUnviewedChange: function (model, nowIsUnviewed) {
    if (model.get('group_id')) {
      return;
    }

    if (nowIsUnviewed) {
      this.render();
    } else {
      this.$list
        .find('[data-room-id="' + model.get('id') + '"] span.unread')
        .remove();
    }
  }
});
