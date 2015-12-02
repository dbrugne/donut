var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var ModalView = Backbone.View.extend({
  el: $('#modal'),

  initialize: function (options) {
    this.$content = this.$('.modal-content').first();
  },
  render: function () {
    return this; // modal container is already in DOM,
  },
  setSize: function (size) {
    this.currentSize = size;
    return this;
  },
  setView: function (view) {
    this.contentView = view;
    this.$content.html(view.$el);

    this.listenTo(view, 'close', this.close);
    return this;
  },
  open: function () {
    this._show();
    $('body').addClass('modal-open');
    return this;
  },
  close: function () {
    this._hide();
    $('body').removeClass('modal-open');
  },
  _show: function () {
    $(this.$el).modal({
      backdrop: true
    });
    // escape key
    $(document).on('keyup', $.proxy(function (e) {
      if (e.which === 27) {
        this.close();
      }
    }, this));

    $(this.$el).on('hide.bs.modal', _.bind(function (e) {
      this.close();
    }, this));

    this.$el.addClass('in');
  },
  _hide: function () {
    // escape key
    $(document).off('keydown');
    $(this.$el).off('hide.bs.modal');

    this.$el.removeClass('in');
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
