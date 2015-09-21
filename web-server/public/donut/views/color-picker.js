var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

var ColorPickerView = Backbone.View.extend({
  template: require('../templates/color-picker.html'),

  colors: window.colors,

  events: {
    'click .preview': 'open',
    'click .close-picker': 'close',
    'mouseover .color': 'onOver',
    'mouseout .color': 'onOut',
    'click .color': 'onPick'
  },

  initialize: function (options) {
    this.color = options.color || '#000000';
    this.name = options.name || 'color';
    this.render();
  },
  render: function () {
    var html = this.template({
      color: this.color,
      colors: this.colors,
      name: this.name
    });
    this.$el.html(html);
    return this;
  },
  open: function (event) {
    this.$('.picker').show();
  },
  close: function (event) {
    this.$('.picker').hide();
  },
  onOver: function (event) {
    var color = $(event.currentTarget).data('color');
    this._setColor(color);
  },
  onOut: function (event) {
    this._setColor(this.color);
  },
  onPick: function (event) {
    this.color = $(event.currentTarget).data('color');
    this._setColor(this.color);
    this.$('.input').val(this.color);
    this.close();
  },
  _setColor: function (color) {
    this.$('.preview').css('background-color', color);
    this.$('.hexadecimal').text(color);
  }

});


module.exports = ColorPickerView;