define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-panel',
  'text!templates/onetoone-panel.html'
], function ($, _, Backbone, DiscussionPanelView, oneToOnePanelTemplate) {
  var OneToOnePanelView = DiscussionPanelView.extend({

    template: _.template(oneToOnePanelTemplate),

    _initialize: function() {
    },

    _remove: function(model) {
    },

    _renderData: function() {
      return this.model.toJSON();
    },

    _render: function() {
    }

  });

  return OneToOnePanelView;
});