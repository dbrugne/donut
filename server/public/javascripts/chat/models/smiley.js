define([
  'underscore',
  'backbone'
], function (_, Backbone) {
  var SmileyModel = Backbone.Model.extend({
    defaults: function() {
      return {
        label: '',
        class: '',
        symbol: ''
      };
    }

  });

  return SmileyModel;
});