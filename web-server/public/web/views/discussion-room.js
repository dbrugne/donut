var Backbone = require('backbone');
var RoomBlocked = require('../views/discussion-room-blocked');
var RoomUnblocked = require('../views/discussion-room-unblocked');

var RoomView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  view: null,

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:blocked', this.onBlockedChange);

    this.render();
  },
  render: function () {
    var constructor = (this.model.get('blocked') === true)
      ? RoomBlocked
      : RoomUnblocked;

    this.view = new constructor({model: this.model});
    this.$el.append(this.view.$el);

    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.attr('data-blocked', !!(this.model.get('blocked')));
    return this;
  },
  removeView: function () {
    if (this.view) {
      this.view.removeView();
    }
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
    } else {
      this.$el.hide();
    }
  },
  onBlockedChange: function () {
    if (this.view) {
      this.view.removeView();
      this.render();
    }
  }
});

module.exports = RoomView;
