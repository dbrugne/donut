define([
  'jquery',
  'underscore',
  'backbone',
  'collections/discussions',
  'views/room-tab',
  'views/room-panel',
  'views/onetoone-tab',
  'views/onetoone-panel'
], function ($, _, Backbone, discussions, RoomTabView, RoomPanelView,
             OneToOnePanelView, OneToOneTabView) {
  /**
   * This view is responsible of displaying room/onetoone tabs block and windows
   * base on DiscussionCollection list.
   */
  var DiscussionsView = Backbone.View.extend({
    $tabContainer: $("#block-rooms .list"),
    $PanelContainer: $("#chat-center"),

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAdd);
      this.listenTo(this.collection, 'focusDefault', this.focusDefault);
      this.listenTo(this.collection, 'unfocusDefault', this.unfocusDefault);
    },

    onAdd: function(model, collection, options) {
      if (model.get('type') == 'room') {
        var tabView = new RoomTabView({collection: collection, model: model });
        var windowView = new RoomPanelView({ collection: collection, model: model });
      } else if (model.get('type') == 'onetoone') {
        var tabView = new OneToOnePanelView({ collection: collection, model: model });
        var windowView = new OneToOneTabView({ collection: collection, model: model });
      } else {
        return;
      }

      this.$tabContainer.append(tabView.$el);
      this.$PanelContainer.append(windowView.$el);
    },

    focusDefault: function() {
      this.$PanelContainer.find('.discussion[data-default=true]').show();
    },

    unfocusDefault: function() {
      this.$PanelContainer.find('.discussion[data-default=true]').hide();
    }

  });

  return new DiscussionsView({collection: discussions});
});