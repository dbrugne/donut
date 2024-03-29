var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var ModalView = Backbone.View.extend({
  el: $('#modal'),

  initialize: function (options) {
    this.$content = this.$('.modal-content').first();
    if (this.$el.attr('id')) {
      this.$el.removeAttr('id');
    }
  },
  render: function () {
    return this; // modal container is already in DOM
  },
  setIdentifier: function (identifier) {
    this.$el.attr('id', identifier);
  },
  setView: function (view) {
    this.contentView = view;
    this.$content.html(view.$el);
    this.listenTo(view, 'close', this.hide);
    return this;
  },
  open: function (options) {
    options = options || {show: true, backdrop: true};
    this.$el.modal(options);
    return this;
  },
  hide: function () {
    this.$el.removeClass('in');
    this.$el.modal('hide');
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
