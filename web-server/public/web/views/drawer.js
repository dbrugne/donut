var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');

var DrawerView = Backbone.View.extend({
  defaultSize: '280px',

  el: $('#drawer'),

  shown: false,

  events: {
    'click .close-drawer': 'close',
    'click .cancel': 'close',
    'mouseup .opacity': 'detectOutsideClick'
  },

  initialize: function (options) {
    this.$wrap = this.$('.wrap').first();
    this.$content = this.$('.content').first();

    this.shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    this.longhandRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

    this.listenTo(app, 'drawerClose', this.close);
  },
  render: function () {
    return this; // drawer container is already in DOM,
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

    $('body').addClass('drawer-open');
    this.trigger('shown');
    return this;
  },
  close: function () {
    this._hide();
    $('body').removeClass('drawer-open');
  },
  detectOutsideClick: function (event) {
    var subject = this.$('.content').first();
    if (event.target.className !== subject.attr('class') && !subject.has(event.target).length) {
      this.close();
    }
  },
  _height: function () {
    var newHeight = $('#center').innerHeight();
    this.$content.height(newHeight);
  },
  _show: function () {
    this._height();

    this.trigger('show');
    this.shown = true;

    var size = this.currentSize || this.defaultSize;
    this.$wrap.css('width', size);

    // escape key
    $(document).on('keyup', $.proxy(this.onKeyUp, this));

    this.$el.show();
    var that = this;
    var width = this.$wrap.width();
    this.$wrap.css('left', '-' + width + 'px');
    this.$wrap.animate({
      left: '0'
    }, {
      duration: 250,
      complete: function () {
        that.trigger('shown');
      }
    });
  },
  onKeyUp: function (event) {
    if (event.which === 27) {
      this.$('[data-toggle="tooltip"]').tooltip('hide');
      this.close();
    }
  },
  _hide: function () {
    this.trigger('hide');

    this.shown = false;

    // escape key
    $(document).off('keyup', this.onKeyUp);

    var that = this;
    var width = this.$wrap.width();
    this.$wrap.animate({
      left: '-' + width + 'px'
    }, {
      duration: 250,
      complete: function () {
        that.$wrap.css('left', '-10000px');
        that.$el.hide();
        if (that.contentView) {
          if (_.isFunction(that.contentView._remove)) {
            that.contentView._remove();
          } else {
            that.contentView.remove();
          }
        }
      }
    });
  },
  _validHex: function (hex) {
    if (!hex) {
      return false;
    }
    return (this.shorthandRegex.test(hex) || this.longhandRegex.test(hex));
  },
  _cleanupState: function () {
    this.$el.removeClass(function (index, css) {
      return (css.match(/(has-(success|error))+/g) || []).join(' ');
    });
  }
});

module.exports = DrawerView;
