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

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onAdd);
      this.listenTo(this.model, 'history:loaded', this.onHistoryLoaded);
      this.listenTo(this.model, 'change:focused', this.updateMoment);

      var that = this;
      _.defer(function() { // => Uncaught TypeError: Cannot read property '0' of null
        that.render();
      });

      // Regularly update moment times
      setInterval(function() { that.updateMoment(); }, 45*1000); // every 45s
    },
    render: function() {
      var that = this;
      this.$el.mCustomScrollbar({
        scrollInertia         : 0,
        alwaysShowScrollbar   : 2,
        theme                 : 'rounded-dark',
        mouseWheel            : { enable: true },
        keyboard              : { scrollAmount: 30 },
        scrollButtons         : { enable: true },
        advanced:{
          updateOnContentResize: true
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
        that.onEvent(model);
      });
    },
    updateMoment: function() {
      if (!this.model.get('focused')) return;

      // Update all .moment of the discussion panel
      this.$el.find('.moment').momentify();
    },
    scrollDown: function() {
      // too early scrollDown calls (router) will trigger scrollbar generation
      // on scrollTo and make everything explode
      if (this.scrollReady) {
        var that = this;
        _.defer(function() {
          that.$el.mCustomScrollbar('scrollTo', 'bottom');
        });
      }
    },
    onAdd: function(model, collection, options) {
      return this.onEvent(model);
    },
    onEvent: function(model, collection, options) {
//      console.log('new event '+model.get('id')+' of type '+model.get('type'));
//      var _start = Date.now();

      var firstElement, lastElement, previousElement, nextElement;

      // all .event list
      var list = this.$timeline.find('.event').get(); // @todo : test optimisation, save this.$timeline.find('.event') and test .length, do .get() only for reverse search

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

      // decorate
      element.find('.moment').momentify(); // time

      var linkifyOptions = {
        linkAttributes: {
          'data-colorify-text': 'color'
        }
      };
      if (this.model.get('color'))
        linkifyOptions.linkAttributes['data-colorify'] = this.model.get('color');
      else if (this.model.get('data') && this.model.get('data').color)
        linkifyOptions.linkAttributes['data-colorify'] = this.model.get('data').color;

      element.find('.text')
        .smilify() // smileys
        .linkify(linkifyOptions); // links
      element.colorify(); // color (after linkify)

      // display
      var that = this;
      element.animate({
        opacity: 1
      }, 200);

//      var _duration = Date.now() - _start;
//      console.log('new event '+model.get('id')+' rendered in '+_duration+'ms');

      if (!nextElement)
        this.scrollDown(); // auto-scroll down
    },
    _renderEvent: function(model, withBlock) {
      var data = model.toJSON();

      if (data.data.avatar || data.data.color)
        data.data.avatar = $.cd.userAvatar(data.data.avatar, 30, data.data.color);
      if (data.data.by_avatar || data.data.by_avatar)
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

      // until
      var until = $(event.currentTarget).data('days');

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
        client.roomHistory(this.model.get('name'), since, until);
      else if (this.model.get('type') == 'onetoone')
        client.userHistory(this.model.get('username'), since, until);
    },

    onHistoryLoaded: function() {
      this.historyLoading = false;
      this.$timeline.find('.history .spinner').hide();
    }

  });

  return EventsView;
});