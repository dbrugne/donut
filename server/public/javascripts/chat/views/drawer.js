define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var DrawerView = Backbone.View.extend({

    defaultSize: '280px',

    defaultColor: '#000000',

    el: $('#drawer'),

    events: {
      'click .close': 'onClose',
      'mouseup .opacity': 'detectOutsideClick'
    },

    currentColor: '',

    initialize: function(options) {
      this.mainView = options.mainView;

      this.shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      this.longhandRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
    },

    /**
     * The drawer container is already in DOM, this.render(data) only set the
     * drawer content and backcolor.
     */
    render: function(data) {
      if (!data.el) return this;
      this.$contentEl = data.el;

      // Size
      if (!data.width) data.width = this.defaultSize;
      this.$el.find('.wrap').first().css('width', data.width);

      // Color
      this.currentColor = (!this._validHex(data.color))
        ? this.defaultColor
        : data.color;
      var rgb = this._hexToRgb(this.currentColor);
      var rgbBg = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', 0.6)';
      this.$el.find('.opacity').first().css('background-color', rgbBg);

      if (data.el.attr('id') == this.$el.find('.content > div').first().attr('id'))
        return this; // avoid emptying and refilling content for the same drawer to avoid events unbind

      // HTML
      this.$el.find('.content').first()
        .empty()
        .append(data.el);

      return this;
    },
    _validHex: function(hex) {
      if (!hex)
       return false;

      if (this.shorthandRegex.test(hex))
        return true;

      if (this.longhandRegex.test(hex))
        return true;

      return false;
    },
    _hexToRgb: function(hex) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      hex = hex.replace(this.shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
      });

      var result = this.longhandRegex.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    show: function() {
      // show
      this.$el.show();

      // color
      $('#color').css('background-color', this.currentColor);

      // transition content
      var that = this;
      var w = this.$el.find('.wrap').width();
      this.$el.find('.wrap').css('left', '-'+w+'px');
      this.$el.find('.wrap').animate({
        left: '0'
      }, {
        duration: 500,
        complete: function () {
          that.$contentEl.trigger('shown');
        }
      });
    },
    hide: function() {
      // transition content
      var that = this;
      var w = this.$el.find('.wrap').width();
      this.$el.find('.wrap').animate({
        left: '-'+w+'px'
      }, {
        duration: 500,
        complete: function () {
          that.$el.find('.wrap').css('left', '-10000px');
          that.$el.hide();
          $('#color').css('background-color', '#fc2063'); // @todo : store in better place
          that.$contentEl.trigger('hidden');
        }
      });
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