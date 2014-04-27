define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-panel',
  'views/main',
  'text!templates/onetoone-panel.html'
], function ($, _, Backbone, DiscussionPanelView, mainView, oneToOnePanelTemplate) {
  var OneToOnePanelView = DiscussionPanelView.extend({

    template: _.template(oneToOnePanelTemplate),

    _events: {
      'click .header > .name': function(event) { // @todo : move in MainView (behavior is added in DOM only with CSS class
        mainView.userProfileModal(
          this.model.get('user_id')
        );
      }
    },

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