define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'moment',
  'text!templates/events.html'
], function ($, _, Backbone, client, moment, eventsTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),

    historyLoading: false,

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onEvent);
      this.listenTo(this.model, 'history:loaded', this.onHistoryLoaded);
      this.listenTo(this.model, 'change:focused', this.updateMoment);

      this.render();

      var that = this;

      // Watch for scroll to the top
      /**
       * @todo : after room:history add confirmation message
       * @todo : add spacer at .events top to be able to scroll even if on top
       * @todo : text on load
       * @todo : => remove auto spinner and add a button to load more (50, 100, 1000)
       * @todo : handle no more history
       * @todo : animate on display
       * @todo : aggregate by day (!!!)
       */

      this.$scroller.scroll(function() {
        if (this.scrollTop == 0 && !that.historyLoading) {
          that.historyLoading = true;

          $('<div class="block spinner">Patientez, on est partis aux archives regarder<i class="fa fa-spinner fa-spin fa-2x"></i></div>').prependTo(that.$scroller);
          setTimeout(function() {
            // since, only one hello could be present in DOM, so with 2 elements
            //  we must have at least one real event
            var since;
            var lasts = that.collection.first(2);
            if (lasts[0] && lasts[0].get('id') != 'hello')
              since = lasts[0].get('id');
            else if (lasts[1] && lasts[1].get('id') != 'hello')
              since = lasts[1].get('id');
            else
              since = 0;

            client.roomHistory(that.model.get('name'), since, 5);

          }, 2000);
        };
      });

      // Regularly update moment times
      setInterval(function() { that.updateMoment(); }, 45*1000); // every 45s
    },
    render: function() {
      this.$el.scroller({
        duration: 500
      });

      // Scroller will automatically move content in div.scroller-content
      this.$scroller = this.$el.find('.scroller-content');

      return this;
    },
    onHistoryLoaded: function() {
      this.historyLoading = false;
      this.$scroller.find('.block.spinner').remove();
    },
    updateMoment: function() {
      if (!this.model.get('focused')) return;

      // Update all .moment of the discussion panel
      this.$el.find('.moment').momentify();
    },
    scrollDown: function() {
      this.$el
        .scroller('reset')
        .scroller('scroll', this.$scroller.prop('scrollHeight'), 500);
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
        var block = $(html).insertAfter($(previousElement).closest('.block'));
        element = block.find('.event').first();
      } else if (nextElement) {
        // before next, with block
        var html = this._renderEvent(model, true);
        var block = $(html).insertBefore($(nextElement).closest('.block'));
        element = block.find('.event').first();
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

      // display
      var that = this;
      element.animate({
        opacity: 1
      }, {

      });

      if (!nextElement)
        this.scrollDown(); // auto-scroll down
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
    }
  });

  return EventsView;
});