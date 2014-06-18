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
      this.listenTo(this.model, 'change:status', this.updateStatus);
      this.updateStatus();
    },
    _remove: function(model) {
    },
    _renderData: function() {
      var data = this.model.toJSON();
      return data;
    },
    _render: function() {
    },
    updateStatus: function() {
      console.log('passe ici');
      if (this.model.get('status')) {
        this.$el.find('.header .status').text('online');
      } else {
        this.$el.find('.header .status').text('offline');
      }
    }

  });

  return OneToOnePanelView;
});