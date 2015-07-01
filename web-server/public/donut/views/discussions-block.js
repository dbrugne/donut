define([
  'jquery',
  'underscore',
  'backbone',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'views/window',
  '_templates'
], function ($, _, Backbone, rooms, onetoones, currentUser, windowView, templates) {
  var DiscussionBlockView = Backbone.View.extend({

    el: $("#block-discussions"),

    template: templates['discussion-block.html'],

    events: {},

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(windowView, 'redraw-block', this.render);
      this.listenTo(onetoones, 'change:avatar', this.render);
      this.listenTo(rooms, 'change:avatar', this.render);
      this.listenTo(currentUser, 'change:positions', this.onPositionsChange);

      this.initialRender();
    },
    initialRender: function() {
      this.$list = this.$el.find('.list');

      // @doc: https://github.com/voidberg/html5sortable
      this.$list.sortable({
        items: '.item', // which items inside the element should be sortable
        //handle: 'h2', // restrict drag start to the specified element
        forcePlaceholderSize: true, // if true, forces the placeholder to have a height
        //connectWith: '.connected', // create connected lists
        placeholder : '<div class="placeholder">'+ $.t('chat.placeholder')+'</div>'
      });

      var that = this;
      //this.$list.sortable().bind('sortstart', function(event, ui) {
      //});
      this.$list.sortable().bind('sortupdate', function(event, ui) {
        /*
         ui.item contains the current dragged element.
         ui.item.index() contains the new index of the dragged element
         ui.oldindex contains the old index of the dragged element
         */
        that.mainView.persistPositions(true); // silently
      });
    },
    render: function() {
      var positions = (_.isArray(currentUser.get('positions'))) ? currentUser.get('positions') : [];

      // prepare data
      var data = [];
      function prepareItems(o) {
        var json = o.toJSON();
        if (o.get('type') == 'room') {
          json.avatar = $.cd.roomAvatar(json.avatar, 20);
          json.uri = '#room/'+o.get('name').replace('#', '');
          json.identifier = o.get('name');
        } else {
          json.avatar = $.cd.userAvatar(json.avatar, 20);
          json.uri = '#user/'+o.get('username');
          json.identifier = o.get('username');
        }
        json.position = positions.indexOf(json.identifier);
        data.push(json);
      }
      _.each(rooms.models, prepareItems);
      _.each(onetoones.models, prepareItems);

      // sort discussions
      data = _.sortBy(data, 'position');

      var html = this.template({list: data});
      this.$list.html(html);
      this.$list.sortable('reload');
      return this;
    },
    redraw: function() {
      return this.render();
    },
    onPositionsChange: function(model, value, options) {
      this.render();
    }

  });

  return DiscussionBlockView;
});