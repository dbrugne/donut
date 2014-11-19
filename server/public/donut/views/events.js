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

    events: {
      "click .history a.load": "onHistory"
    },

    historyLoading: false,

    scrollReady: false,

    scrollBottom: false,

    interval: null,

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAdd);
      this.listenTo(this.collection, 'remove', this.onRemove);
      this.listenTo(this.model, 'history:loaded', this.onHistoryLoaded);
      this.listenTo(this.model, 'change:focused', this.onFocus);

      var that = this;
      _.defer(function() { // => Uncaught TypeError: Cannot read property '0' of null
        that.render();
      });

      // recurent tasks
      this.interval = setInterval(function() {
        if (!that.model.get('focused')) // only on currently focused view
          return;

        // remove old messages (only if scroll is bottom)
        if (that.scrollBottom)
          that.collection.cleanup();

        // update moment times
        that.updateMoment();
      }, 45*1000); // every 45s
    },
    render: function() {
      var that = this;
      this.$el.mCustomScrollbar({
        scrollInertia         : 0,
        alwaysShowScrollbar   : 2,
        theme                 : 'rounded-dark',
        mouseWheel            : { enable: true, scrollAmount: 75 },
        keyboard              : { scrollAmount: 30 },
        scrollButtons         : { enable: true },
        live                  : false,
        advanced:{
          updateOnContentResize: false // we update manually
        },
        callbacks:{
          onScroll: function() {
            if (this.mcs.topPct == 100)
              that.scrollBottom = true;
            else
              that.scrollBottom = false;
          }
        }
      });

      this.scrollReady = true;

      // prevent browser go to # when clicking on button with not enough content
      // to have scroll activated
      this.$el.find('.mCSB_buttonUp, .mCSB_buttonDown').on('click', function(e) {
        e.preventDefault();
      });

      // scroll library move content in child div
      this.$timeline = this.$el.find('.mCSB_container');

      // render already in collection events
      this.collection.each(function(model) {
        that.displayEvent(model, false);
      });

      // then scroll to bottom
      this.scrollDown();
    },
    _remove: function() {
      clearInterval(this.interval);
      this.$el.mCustomScrollbar('destroy');
      this.remove();
    },
    updateMoment: function() {
      // Update all .moment of the discussion panel
      this.$el.find('.moment').momentify();
    },
    scrollDown: function() {
      // too early calls (router) will trigger scrollbar generation
      // on scrollTo and make everything explode
      if (this.scrollReady) {
        var that = this;
        _.delay(function() {
          that.$el.mCustomScrollbar('update');
          that.$el.mCustomScrollbar('scrollTo', 'bottom');

          // disable scroll until discussion is focused again
          that.$el.mCustomScrollbar('disable');
        }, 100);
      }
    },
    onFocus: function(model, value, options) {
      if (value) {
        this.scrollDown();
        this.updateMoment();
      }
    },
    onAdd: function(model, collection, options) {
      return this.displayEvent(model);
    },
    onRemove: function(model, collection, options) {
      var $event = this.$el.find("[data-event-id='"+model.get('id')+"']");
      if (!$event)
        return;

      var $block = $event.closest('.block');

      $event.remove();

      if (model.getGenericType() == 'standard' || $block.find('.event').length < 1) { // "or" condition can help to save some DOM selection
        // handle empty block removing
        $block.remove();
      }
    },
    displayEvent: function(model, autoscroll) {
//      console.log('new event '+model.get('id')+' of type '+model.get('type'));
//      var _start = Date.now();
      autoscroll = (autoscroll !== undefined && autoscroll === false)
        ? false
        : true;

      var firstElement, lastElement, previousElement, nextElement;

      // all .event list
      var $list = this.$timeline.find('.event');

      if ($list.length > 0)
        firstElement = $list.first();
      if ($list.length > 1)
        lastElement = $list.last();

      if (firstElement && model.get('data').time < $(firstElement).data('time'))
        nextElement = firstElement;
      // special case (after last)
      else if (lastElement && model.get('data').time > $(lastElement).data('time'))
        previousElement = lastElement;
      // normal case (loop)
      else if ($list.length > 0) {
//        console.log('events list loop: '+model.get('type'));
        var list = $list.get();
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
        // just append container, with block
        var html = this._renderEvent(model, true);
        var block = $(html).appendTo(this.$timeline);
        element = block.find('.event').first();
      }

//      // day separator
//      var dayHtml = this.template({
//        type: 'date',
//        day : moment(model.get('time')).format('LLLL')
//      });
//      if (!previousElement) {
//        $(dayHtml).insertBefore($(element).closest('.block'));
//      } else if (previousElement && !model.sameDayAsModel(previousModel)) {
//        $(dayHtml).insertBefore($(element).closest('.block'));
//      }

      // time
      element.find('.moment').momentify(); // time

      // links
      var linkifyOptions = {
        linkAttributes: {
          'data-colorify-text': 'color'
        }
      };
      if (this.model.get('color'))
        linkifyOptions.linkAttributes['data-colorify'] = this.model.get('color');
      else if (this.model.get('data') && this.model.get('data').color)
        linkifyOptions.linkAttributes['data-colorify'] = this.model.get('data').color;
      element.find('.text').linkify(linkifyOptions);

      // smileys
      element.find('.text').smilify();

      // colors
      element.colorify(); // (after linkify)

//      var _duration = Date.now() - _start;
//      console.log('new event '+model.get('id')+' rendered in '+_duration+'ms');

      if (autoscroll && !nextElement)
        this.scrollDown();
    },
    _renderEvent: function(model, withBlock) {
      var data = model.toJSON();

      // avatar
      var size = (model.getGenericType() != 'inout')
        ? 30
        : 20;
      if (data.data.avatar || data.data.color)
        data.data.avatar = $.cd.userAvatar(data.data.avatar, size, data.data.color);
      if (data.data.by_avatar || data.data.by_avatar)
        data.data.by_avatar = $.cd.userAvatar(data.data.by_avatar, size, data.data.by_color);

      // escape HTML
      if (data.data.message) {
        data.data.message = _.escape(data.data.message);
      }

      // mentions
      if (this.model.get('type') == 'room' && data.data.message) {
        data.data.message = data.data.message.replace(
          /@\[([^\]]+)\]\(user:([^)]+)\)/g,
          '<a class="mention open-user-profile" data-username="$1" data-colorify-text="color" data-colorify="'+this.model.get('color')+'">@$1</a>'
        );
      }

      // rendering attributes
      data.isNew = model.get('new');
      data.withBlock = withBlock || false;
      try {
        return this.template(data);
      } catch (e) {
        console.log('Render exception, see below');
        console.log(e);
        return false;
      }
    },
    onHistory: function(event) {
      event.preventDefault();
      event.stopPropagation();

      // noise protection
      if (this.historyLoading)
        return;
      else
        this.historyLoading = true;

      // spinner
      this.$el.find('.history .spinner').show();

//      // until
//      var until = $(event.currentTarget).data('days');

      // since, only one hello could be present in DOM, so with 2 elements
      //  we must have at least one real event
      var since;
      var lasts = this.collection.first(2);
      if (lasts[0] && lasts[0].get('id') != 'hello')
        since = lasts[0].get('time');
      else if (lasts[1] && lasts[1].get('id') != 'hello')
        since = lasts[1].get('time');
      else
        since = Date.now();

      // @todo : cleanup this code, call on model for example
      if (this.model.get('type') == 'room')
        client.roomHistory(this.model.get('name'), since, '');
      else if (this.model.get('type') == 'onetoone')
        client.userHistory(this.model.get('username'), since, '');
    },
    onHistoryLoaded: function() {
      this.historyLoading = false;
      this.$timeline.find('.history .spinner').hide();
    }

  });

  return EventsView;
});