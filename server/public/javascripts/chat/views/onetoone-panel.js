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
      var data = this.model.toJSON();

      data.avatar = $.cloudinary.url('avatar-'+this.model.get('user_id'), {
        default_image: 'avatar_default.png', // @todo : get from configuration file
        crop: 'fill',
        width: '20', // @todo : get from configuration file
        height: '20' // @todo : get from configuration file
      });

      return data;
    },

    _render: function() {
    }

  });

  return OneToOnePanelView;
});