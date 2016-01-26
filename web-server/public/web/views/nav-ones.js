var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');

module.exports = Backbone.View.extend({
  el: $('#ones'),

  template: require('../templates/nav-ones.html'),

  events: {
    'click .more': 'onToggleCollapse',
    'click .less': 'onToggleCollapse'
  },

  toggleCount: 4,

  initialize: function (options) {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationOnes', this.render);
    this.listenTo(app, 'focusedModelChanged', this.highlightFocused);
    this.listenTo(app.ones, 'change:avatar', this.render);

    this.listenTo(app.ones, 'change:unviewed', this.onUnviewedChange);

    this.$list = this.$('.list');
  },
  render: function () {
    // console.warn('render nav-one');
    if (!app.ones.models.length) {
      this.$list.empty();
      return this.$el.addClass('empty');
    } else {
      this.$el.removeClass('empty');
    }
    var data = [];
    _.each(app.ones.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      data.push(json);
    });

    var html = this.template({list: data, toggleCount: this.toggleCount});
    this.$list.html(html);
    return this;
  },
  onToggleCollapse: function (event) {
    $(event.currentTarget).parents('.list').toggleClass('collapsed');
  },
  highlightFocused: function (model) {
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
    });

    if (!model || model.get('type') !== 'onetoone') {
      return;
    }

    var that = this;
    _.find(app.ones.models, function (one) {
      if (one.get('focused') === true) {
        that.$list.find('[data-one-id="' + one.get('id') + '"]').addClass('active');
      }
    });
  },
  onUnviewedChange: function (model, nowIsUnviewed) {
    if (nowIsUnviewed) {
      this.render();
    } else {
      this.$list
        .find('[data-one-id="' + model.get('id') + '"] span.unread')
        .remove();
    }
  }
});
