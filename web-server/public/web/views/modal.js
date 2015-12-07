var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var ModalView = Backbone.View.extend({
  el: $('#modal'),

  initialize: function (options) {
    this.$content = this.$('.modal-content').first();
  },
  render: function () {
    return this; // modal container is already in DOM
  },
  setView: function (view) {
    this.contentView = view;
    this.$content.html(view.$el);

    this.listenTo(view, 'close', this.hide);
    return this;
  },
  open: function (options) {
    var options = options || {'show': true, backdrop: true};
    $(this.$el).modal(options);
    return this;
  },
  hide: function () {
    this.$el.removeClass('in');
    $(this.$el).modal('hide');
    if (this.contentView) {
      if (_.isFunction(this.contentView._remove)) {
        this.contentView._remove();
      } else {
        this.contentView.remove();
      }
    }
  }
});
module.exports = ModalView;
