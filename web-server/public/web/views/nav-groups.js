var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var urls = require('../../../../shared/util/url');

module.exports = Backbone.View.extend({
  el: $('#groups'),

  template: require('../templates/nav-groups.html'),

  events: {
    'click .more': 'onToggleCollapse',
    'click .less': 'onToggleCollapse'
  },

  toggleCount: 4,

  expanded: [],

  initialize: function (options) {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationGroups', this.render);
    this.listenTo(app, 'nav-active', this.highlightFocused);
    this.listenTo(app, 'nav-active-group', this.highlightGroup);
    this.listenTo(app, 'viewedEvent', this.setAsViewed);

    this.$list = this.$('.list');
  },
  render: function () {
    console.log('___render nav groups___');
    if (!this.filterRooms().length && !app.groups.models.length) {
      this.$list.empty();
      this.$el.addClass('empty');
      return;
    } else {
      this.$el.removeClass('empty');
    }

    var groups = [];
    // first hydrate non empty groups
    _.each(this.filterRooms(), function (o) {
      var json = o.toJSON();
      // append current room to the room list of his group, if aleady initialized
      var found = _.find(groups, function (group) {
        if (group.id !== json.group_id) {
          return false;
        }
        group.rooms.push(json);
        return true;
      });

      if (found) {
        return;
      }

      // group not found, initialize it
      var group = {
        id: json.group_id,
        type: 'group',
        identifier: '#' + json.group_name,
        name: json.group_name,
        avatar: common.cloudinary.prepare(json.group_avatar, 40),
        rooms: []
      };
      group.uri = urls(group, 'group', 'uri');
      group.rooms.push(json);
      groups.push(group);
    });

    // Now append empty groups to previous list
    _.each(app.groups.models, function (g) {
      var json = g.toJSON();
      if (_.find(groups, function (group) {
          return (group.id === json.id);
        })) {
        return;
      }
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      json.rooms = [];
      groups.push(json);
    });

    groups = _.sortBy(groups, 'last_event_at');

    var html = this.template({
      listGroups: groups,
      toggleCount: this.toggleCount,
      expanded: this.expanded
    });
    this.$list.html(html);

    this.$list.on('shown.bs.collapse', this.onUncollapsed);
    this.$list.on('hidden.bs.collapse	', this.onCollapsed);

    return this;
  },
  onToggleCollapse: function (event) {
    $(event.currentTarget).parents('.list').toggleClass('collapsed');
  },
  highlightFocused: function () {
    console.log('___highlightFocused groups___');
    var that = this;
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
      var group = $(this).parents('.group');
      group.removeClass('highlighted');
      // if (group.find('li.room-type').length > that.toggleCount) {
      //   group.addClass('collapsed');
      // }
    });
    _.find(this.filterRooms(), function (room) {
      if (room.get('focused') === true) {
        var elt = that.$list.find('[data-room-id="' + room.get('id') + '"]');
        elt.addClass('active');
        var group = elt.parents('.group');
        group.addClass('highlighted');
        group.removeClass('collapsed'); // always expand a group when one of its room is selected
        return true;
      }
    });
  },
  highlightGroup: function (data) {
    console.log('___highlightGroup groups___');
    var elt = this.$list.find('[data-type="group"][data-group-id="' + data.group_id + '"]');
    elt.addClass('active');

    if (data.popin) {
      var $popin = $('#popin');
      $popin.find('.modal-title').html(i18next.t('popins.group-create.title'));
      $popin.find('.modal-body').html(i18next.t('popins.group-create.content', {
        groupname: data.group_name,
        groupid: data.group_id
      }));
      $popin.modal('show');
    }
  },
  setAsViewed: function (model) {
    this.$list
      .find('[data-room-id="' + model.get('id') + '"] span.unread')
      .remove();
  },
  // Only keep rooms that are part of a group
  filterRooms: function () {
    return _.filter(app.rooms.models, function (room) {
      return room.get('group_id');
    });
  },
  onUncollapsed: function (event) {
    console.log('___onUncollapsed groups___');
  },
  onCollapsed: function (event) {
    console.log('___onCollapsed groups___');
  }
});
