define([
  'jquery',
  'underscore',
  'backbone',
  'models/app'
], function ($, _, Backbone, app) {
  var DrawerView = Backbone.View.extend({

    defaultSize: '280px',

    defaultColor: '#000000',

    el: $('#drawer'),

    shown: false,

    events: {
      'click .close': 'close',
      'click .cancel': 'close',
      'mouseup .opacity': 'detectOutsideClick'
    },

    initialize: function(options) {
      this.$opacity = this.$el.find('.opacity').first();
      this.$wrap = this.$el.find('.wrap').first();
      this.$content = this.$el.find('.content').first();

      this.shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      this.longhandRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

      this.listenTo(app, 'drawerClose', this.close);
    },
    render: function() {
      return this; // drawer container is already in DOM,
    },
    setSize: function(size) {
      this.currentSize = size;
      return this;
    },
    setColor: function(color) {
      this.currentColor = color;
      return this;
    },
    setView: function(view) {
      this.contentView = view;
      this.$content.html(view.$el);

      this.listenTo(view, 'color', this.color);
      this.listenTo(view, 'close', this.close);

      return this;
    },
    open: function() {
      this._show();
      this.trigger('shown');
      return this;
    },
    close: function() {
      this._hide();
    },
    color: function(color) {
      color = (this._validHex(color))
          ? color
          : this.defaultColor;

      app.trigger('changeColor', color, true);
    },
    detectOutsideClick: function(event) {
      var subject = this.$el.find('.content').first();
      if(event.target.className != subject.attr('class') && !subject.has(event.target).length)
        this.close();
    },
    _height: function() {
      var newHeight = $('#center').innerHeight();
      this.$content.height(newHeight - (40));
    },
    _show: function() {
      this._height();

      //this.color(this.currentColor, true);
      this.trigger('show');
      this.shown = true;

      var size = this.currentSize || this.defaultSize;
      this.$wrap.css('width', size);

      // escape key
      $(document).on('keydown', $.proxy(function (e) {
        if (e.which == 27)
            this.close();
      }, this));

      this.$el.show();
      var that = this;
      var width = this.$wrap.width();
      this.$wrap.css('left', '-'+width+'px');
      this.$wrap.animate({
        left: '0'
      }, {
        duration: 250,
        complete: function () {
          that.trigger('shown');
        }
      });
    },
    _hide: function() {
      this.trigger('hide');

      var wasShown = this.shown;
      this.shown = false;

      // escape key
      $(document).off('keydown');

      var that = this;
      var width = this.$wrap.width();
      this.$wrap.animate({
        left: '-'+width+'px'
      }, {
        duration: 250,
        complete: function () {
          that.$wrap.css('left', '-10000px');
          that.$el.hide();
          if (wasShown)
            app.trigger('changeColor', '', false, true);
          if (that.contentView) {
            that.contentView.remove();
          }
        }
      });
    },
    _validHex: function(hex) {
      if (!hex)
        return false;

      if (this.shorthandRegex.test(hex))
        return true;

      if (this.longhandRegex.test(hex))
        return true;

      return false;
    }

  });

  return DrawerView;
});