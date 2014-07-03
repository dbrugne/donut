define([
  'jquery',
  'underscore',
  'backbone',
  'views/onetoone-header',
  'views/discussion-panel',
  'text!templates/onetoone-panel.html'
], function ($, _, Backbone, OneToOneHeaderView, DiscussionPanelView, oneToOnePanelTemplate) {
  var OneToOnePanelView = DiscussionPanelView.extend({

    template: _.template(oneToOnePanelTemplate),

    _initialize: function() {
      this.listenTo(this.model, 'change:status', this.updateStatus);
      this.headerView = new OneToOneHeaderView({el: this.$el.find('.header'), model: this.model});
      this.updateStatus();
    },
    _remove: function(model) {
      this.headerView.remove();
    },
    _renderData: function() {
      var data = this.model.toJSON();
      return data;
    },
    _render: function() {
    },
    updateStatus: function() {
      if (this.model.get('status')) {
        this.$el.find('.header .status').text('online');
      } else {
        this.$el.find('.header .status').text('offline');
      }
    }

  });

  return OneToOnePanelView;
});