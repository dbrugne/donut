var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');

module.exports = Backbone.View.extend({
  el: $('#rooms'),

  template: require('../templates/nav-rooms.html'),

  events: {
    'click .more': 'onToggleCollapse',
    'click .less': 'onToggleCollapse'
  },

  toggleCount: 4,

  initialize: function (options) {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationRooms', this.render);
    this.listenTo(app, 'nav-active', this.highlightFocused);
    this.listenTo(app, 'nav-active-group', this.highlightGroup);
    this.listenTo(app, 'viewedEvent', this.setAsViewed);

    this.$list = this.$('.list');
    this.$empty = this.$('.empty');
  },
  render: function () {
    if (!app.rooms.models.length) {
      this.$list.empty();
      return this.$empty.show();
    } else {
      this.$empty.hide();
    }

    var groupIds = [];
    var dataGroups = [];
    var dataRooms = [];
    _.each(app.rooms.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      groupIds.push(json.group_id);
      dataRooms.push(json);
    });
    groupIds = _.uniq(groupIds, false); // return array id unique. delete doubloon

    _.each(app.groups.models, function (g) {
      var json = g.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      if (_.indexOf(groupIds, json.id) === -1) {
        dataGroups.push(json);
      }
    });
    dataGroups = _.sortBy(dataGroups, 'name');

    var html = this.template({listRooms: dataRooms, listGroups: dataGroups, toggleCount: this.toggleCount, expand: true});
    this.$list.html(html);

    this.initializeCollapse();
    return this;
  },
  initializeCollapse: function () {
    var that = this;
    this.$list.find('.group-block').each(function () {
      if ($(this).find('li.room-type').length > that.toggleCount) {
        $(this).addClass('collapsed');
      }
    });
  },
  onToggleCollapse: function (event) {
    $(event.currentTarget).parents('.group-block').toggleClass('collapsed');
  },
  highlightFocused: function () {
    var that = this;
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
      var group = $(this).parents('.group-block');
      group.removeClass('highlighted');
      if (group.find('li.room-type').length > that.toggleCount) {
        group.addClass('collapsed');
      }
    });
    _.find(app.rooms.models, function (room) {
      if (room.get('focused') === true) {
        var elt = that.$list.find('[data-room-id="' + room.get('id') + '"]');
        elt.addClass('active');
        var group = elt.parents('.group-block');
        group.addClass('highlighted');
        group.removeClass('collapsed'); // always expand a group when one of its room is selected
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
  }
});
