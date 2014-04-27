define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-tab',
  'text!templates/onetoone-tab.html'
], function ($, _, Backbone, DiscussionTabView, oneToOneTabTemplate) {
  var OneToOneTabView = DiscussionTabView.extend({

    template: _.template(oneToOneTabTemplate),

    _initialize: function(options) {
      //
    },

    _renderData: function() {
      return this.model.toJSON();
    }

  });

  return OneToOneTabView;
});