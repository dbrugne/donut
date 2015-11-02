var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var onetoones = require('../collections/onetoones');

module.exports = Backbone.View.extend({
  el: $('#ones'),

  template: require('../templates/nav-ones.html'),

  events: {},

  initialize: function (options) {
    this.listenTo(app, 'redrawNavigation', this.render);
    this.listenTo(app, 'redrawNavigationOnes', this.render);
    this.listenTo(app, 'nav-active', this.highlightFocused);
    this.listenTo(onetoones, 'change:avatar', this.render);
    this.$list = this.$('.list');
  },
  render: function () {
    //console.log('render ones');
    if (!onetoones.models.length) {
      this.$list.empty();
      return this.$el.hide();
    } else {
      this.$el.show();
    }
    var data = [];
    _.each(onetoones.models, function (o) {
      var json = o.toJSON();
      json.avatar = common.cloudinary.prepare(json.avatar, 40);
      data.push(json);
    });

    var html = this.template({list: data});
    this.$list.html(html);
    return this;
  },
  highlightFocused: function () {
    this.$list.find('.active').each(function (item) {
      $(this).removeClass('active');
    });
    var that = this;
    _.find(onetoones.models, function (one) {
      if (one.get('focused') === true) {
        that.$list.find('[data-one-id="' + one.get('id') + '"]').addClass('active');
      }
    });
  }
});
