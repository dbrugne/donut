var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../models/app');

var HomeView = Backbone.View.extend({
  tagName: 'div',

  className: 'group',

  initialize: function (options) {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.render();
  },
  render: function () {
    var group = this.model.toJSON();
    group.avatarUrl = common.cloudinary.prepare(group.avatar, 80);
    var html = require('../templates/group.html')({group: group});
    this.$el.html(html);
    return this;
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
    } else {
      this.$el.hide();
    }
  }

});

module.exports = HomeView;
