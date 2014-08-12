define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/color-picker.html'
], function ($, _, Backbone, colorPickerTemplate) {
  var ColorPickerView = Backbone.View.extend({

    template: _.template(colorPickerTemplate),

    colors: window.colors,

    events: {
      'click .preview': 'open',
      'click .close-picker': 'close',
      'mouseover .color': 'onOver',
      'mouseout .color': 'onOut',
      'click .color': 'onPick'
    },

    initialize: function(options) {
      this.color = options.color || '#000000';
      this.name = options.name || 'color';
      this.render();
    },
    render: function() {
      var html = this.template({
        color: this.color,
        colors: this.colors,
        name: this.name
      });
      this.$el.html(html);
      return this;
    },
    open: function(event) {
      this.$el.find('.picker').show();
    },
    close: function(event) {
      this.$el.find('.picker').hide();
    },
    onOver: function(event) {
      var color = $(event.currentTarget).data('color');
      this._setColor(color);
    },
    onOut: function(event) {
      this._setColor(this.color);
    },
    onPick: function(event) {
      this.color = $(event.currentTarget).data('color');
      this._setColor(this.color);
      this.$el.find('.input').val(this.color);
      this.close();
    },
    _setColor: function(color) {
      this.$el.find('.preview').css('background-color', color);
      this.$el.find('.hexadecimal').text(color);
    }

  });

  return ColorPickerView;
});