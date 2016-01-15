var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');

module.exports = Backbone.View.extend({
  el: $('#groups'),

  template: require('../templates/nav-groups.html'),

  events: {
    'click .more': 'onToggleCollapse',
    'click .less': 'onToggleCollapse'
  },

  initialize: function (options) {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationGroups', this.render);
    this.listenTo(app, 'nav-active', this.highlightFocused);
    this.listenTo(app, 'nav-active-group', this.highlightGroup);
    this.listenTo(app, 'viewedEvent', this.setAsViewed);

    this.$list = this.$('.list');
  },
  render: function () {
    if (!this.filterRooms().length && !app.groups.models.length) {
      this.$list.empty();
      this.$el.addClass('empty');
      return;
    } else {
      this.$el.removeClass('empty');
    }

    var groups = [];
    _.each(app.groups.models, function (g) {
      var json = g.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      json.rooms = [];
      groups.push(json);
    });

    _.each(this.filterRooms(), function (o) {
      var json = o.toJSON();
      _.find(groups, function(group) {
        if (group.id !== json.group_id) {
          return false;
        }
        group.rooms.push(json);
        return true;
      });
    });

    groups = _.sortBy(groups, 'name'); // @todo sort by last_event

    var html = this.template({listGroups: groups});
    this.$list.html(html);

    return this;
  },
  onToggleCollapse: function (event) {
    $(event.currentTarget).parents('.group-block').toggleClass('collapsed');
  },
  highlightFocused: function () {
    var that = this;
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
      //var group = $(this).parents('.group-block')
      //group.removeClass('highlighted');
      //if (group.find('li.room-type').length > that.toggleCount) {
      //  group.addClass('collapsed');
      //}
    });
    _.find(this.filterRooms(), function (room) {
      if (room.get('focused') === true) {
        var elt = that.$list.find('[data-room-id="' + room.get('id') + '"]');
        elt.addClass('active');
        //var group = elt.parents('.group-block');
        //group.addClass('highlighted');
        //group.removeClass('collapsed'); // always expand a group when one of its room is selected
        return true;
      }
    });
  },
  highlightGroup: function (data) {
    var elt = this.$list.find('[data-type="group"][data-group-id="' + data.group_id + '"]');
    elt.addClass('active');
    elt.parents('.group-block').addClass('highlighted');

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
  }
});
