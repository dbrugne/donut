define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/events.html'
], function ($, _, Backbone, moment, eventsTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onEvent);
      this.listenTo(this.model, 'change:focused', this.updateMoment);

      this.render();

      // Regularly update moment times
      var that = this;
      setInterval(function() { that.updateMoment(); }, 45*1000); // every 45s
    },
    render: function() {
      this.$el.scroller();

      // Scroller will automatically move content in div.scroller-content
      this.$scroller = this.$el.find('.scroller-content');

      return this;
    },
    updateMoment: function() {
      if (!this.model.get('focused')) return;

      // Update all .moment of the discussion panel
      this.$el.find('.moment').momentify();
    },
    scrollDown: function() {
      this.$el
        .scroller('reset')
        .scroller('scroll', this.$scroller.prop('scrollHeight'));
    },

    onEvent: function(model, collection, options) {
      console.log('new event '+model.get('id'));

      var firstElement, lastElement, previousElement, nextElement;

      // all .event list
      var list = this.$scroller.find('.event').get();

      if (list.length > 0)
        firstElement = list[0];
      if (list.length > 1)
        lastElement = list[(list.length-1)];

      if (firstElement && model.get('data').time < $(firstElement).data('time'))
        nextElement = firstElement;
      // special case (after last)
      else if (lastElement && model.get('data').time > $(lastElement).data('time'))
        previousElement = lastElement;
      // normal case (loop)
      else if (list.length > 0) {
        // should we begin by end?
        if (firstElement && lastElement
          && (model.get('data').time - $(lastElement).data('time'))
          < ($(lastElement).data('time') - model.get('data').time)) {
          list.reverse();
        }

        // loop and set previousElement and nextElement correctly
        var targeted = model.get('data').time;
        var that = this;
        $(list).each(function(index, element) {
          nextElement = this;
          if ((previousElement && $(previousElement).data('time') <= targeted && targeted < $(nextElement).data('time'))
            || (previousElement && $(previousElement).data('time') >= targeted && targeted > $(nextElement).data('time'))) {
            return false; // breaks loop (nextElement and previousElement are set)
          }
          previousElement = nextElement;
        });
      }

      // reverse search case
      if ($(previousElement).data('time') > $(nextElement).data('time')) {
        var tmp = previousElement;
        previousElement = nextElement;
        nextElement = tmp;
      }

      var previousModel, nextModel;
      if (previousElement)
        previousModel = this.collection.get($(previousElement).data('eventId'));
      if (nextElement)
        nextModel = this.collection.get($(nextElement).data('eventId'));

      var element;

      if (previousElement && model.sameBlockAsModel(previousModel)) {
        // after previous, no block
        var html = this._renderEvent(model, false);
        element = $(html).insertAfter(previousElement);
      } else if (nextElement && model.sameBlockAsModel(nextModel)) {
        // before next, no block
        var html = this._renderEvent(model, false);
        element = $(html).insertBefore(nextElement);
      } else if (previousElement) {
        // after previous, with block
        var html = this._renderEvent(model, true);
        element = $(html).insertAfter($(previousElement).closest('.block'));
      } else if (nextElement) {
        // before next, with block
        var html = this._renderEvent(model, true);
        element = $(html).insertBefore($(nextElement).closest('.block'));
      } else {
        // just append to scroller, with block
        var html = this._renderEvent(model, true);
        element = $(html).appendTo(this.$scroller);
      }

      // decorate
      element.find('.moment').momentify(); // time
      element.find('.text')
        .smilify()
        .linkify({
          linkAttributes: {
            'data-colorify': this.model.get('color'),
            'data-colorify-text': 'color'
          }
        }
      ); // links
      element.colorify(); // color (after linkify)

      this.scrollDown();
    },
    _renderEvent: function(model, withBlock) {
      var data = model.toJSON();

      if (data.data.avatar)
        data.data.avatar = $.cd.userAvatar(data.data.avatar, 30, data.data.color);
      if (data.data.by_avatar)
        data.data.by_avatar = $.cd.userAvatar(data.data.by_avatar, 30, data.data.by_color);

      data.withBlock = withBlock || false;
      try {
        return this.template(data);
      } catch (e) {
        console.log('Render exception, see below');
        console.log(e);
        return false;
      }
    },
  });

  return EventsView;
});