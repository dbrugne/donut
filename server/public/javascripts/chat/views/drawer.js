define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var DrawerView = Backbone.View.extend({

    el: $('#drawer'),

    events: {
      'click .close': 'onClose',
      'mouseup .opacity': 'detectOutsideClick'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
    },

    /**
     * The drawer container is already in DOM, this.render(data) only set the
     * drawer content and backcolor.
     */
    render: function(data) {
      if (!data.el) return this;

      if (data.el.attr('id') == this.$el.find('.content > div').first().attr('id'))
        return this; // avoid re-rendering of the same modal that unbind all events

      if (!data.color) data.color = '#000000';

      // Color
      var rgb = this._hexToRgb(data.color);
      var rgbBg = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', 0.6)';
      this.$el.find('.opacity').first().css('background-color', rgbBg);

      // HTML
      this.$el.find('.content')
        .first()
        .empty()
        .append(data.el);

      return this;
    },
    _hexToRgb: function(hex) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
      });

      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    show: function() {
      this.$el.show();
    },
    hide: function() {
      this.$el.hide();
    },
    onClose: function(event) {
      this.hide();
    },
    detectOutsideClick: function(event) {
      var subject = this.$el.find('.content').first();
      if(event.target.className != subject.attr('class') && !subject.has(event.target).length)
        this.hide();
    }

  });

  return DrawerView;
});