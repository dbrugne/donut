define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug'
], function ($, _, Backbone, donutDebug) {

  var debug = donutDebug('donut:navbar');

  var MuteView = Backbone.View.extend({

    el: $('#mute'),

    events: {
      "click .sound" : 'onClickSound'
    },

    initialize: function (options) {
      this.render();
    },

    render: function () {
      return this;
    },

    onClickSound: function (event) {
      console.log('test');
    },

  });

  return MuteView;
});