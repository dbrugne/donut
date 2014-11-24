define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/event',
  'moment',
  'text!templates/events.html',
  'text!templates/event.html'
], function ($, _, Backbone, client, EventModel, moment, eventsTemplate, eventTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),
    eventTemplate: _.template(eventTemplate),

    events: {
      "click .history-loader a.load": "askHistory"
    },

    historyLoading: false,

    scrollReady: false,

    scrollBottom: false,

    interval: null,

    intervalDuration: 45, // seconds

    keepMaxEventsOnCleanup: 250,

    initialize: function(options) {
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'historyEvents', this.onHistoryEvents);
      this.listenTo(this.model, 'change:focused', this.onFocus);

      var that = this;
      _.defer(function() { // => Uncaught TypeError: Cannot read property '0' of null
        that.render();
      });

      // recurent tasks
      this.interval = setInterval(function() {
        // remove old messages
        that.cleanup();

        // update moment times
        that.updateMoment();
      }, this.intervalDuration*1000); // every n seconds
    },
    _id: function() {
      return (this.model.get('name'))
        ? 'room "'+this.model.get('name')+'"'
        : 'onetoone "'+this.model.get('username')+'"';
    },
    _start: function() {
      this.start = Date.now();
    },
    _stop: function(num) {
      var _duration = Date.now() - this.start;
      console.log(num+' event(s) rendered in '+this._id()+' ('+_duration+'ms)');
      this.start = 0;
    },
    _remove: function() {
      clearInterval(this.interval);
      this.$el.mCustomScrollbar('destroy');
      this.remove();
    },
    render: function() {
      // render view
      var html = this.template({
        model: this.model.toJSON(),
        time: Date.now()
      });
      this.$el.append(html);

      //// @todo test
      //this.$truc = this.$el.closest('.content').find('.truc');
      //this.$hello = this.$el.find('.block.hello');
      //// @todo test

      // scrollbar-it
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

            //// @todo test
            //var viewHeight = that.$el.outerHeight() - (parseInt(that.$el.css('padding-top').replace('px', '')) + parseInt(that.$el.css('padding-bottom').replace('px', '')));
            //var contentHeight = this.mcs.content.outerHeight();
            //var pos = that.$hello.position();
            ////that.$truc.css('top', pos.top);
            //console.log('view is '+viewHeight+'px / content is '+contentHeight+'px and hello is at '+pos.top+'px');
            //var top = viewHeight / (contentHeight / pos.top);
            //top += 160; // coumpound block position
            //that.$truc.css('top', top);
            //// @todo test
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
      this.$scrollable = this.$el.find('.mCSB_container');
      this.$history = this.$scrollable.find('.history');
      this.$realtime = this.$scrollable.find('.realtime');

      // render events received on 'connect' (in .history)
      if (this.model.get('connectHistory') && this.model.get('connectHistory').length > 0) {
        this.addBatchEvents(this.model.get('connectHistory'), 'connect');
        this.model.set('connectHistory', null);
      }

      // then scroll to bottom
      this.scrollDown();
    },
    cleanup: function(event) {
      if (this.model.get('focused') && !this.scrollBottom)
        return; // no action when focused AND scroll not on bottom

      var hl = this.$history.find('.block').length;
      var rl = this.$realtime.find('.block').length;

      if ((hl + rl) < 250) // not enough content, no need to cleanup
        return console.log('cleanup '+this._id()+ ' not enough event to cleanup: '+(hl + rl));

      // @todo : only when a certain amount of content OR when history is not visible on scroll position

      // cleanup .history
      this.$history.empty();

      // cleanup .realtime
      var length = this.$realtime.find('.block').length;
      var remove = (length > this.keepMaxEventsOnCleanup)
        ? (length - this.keepMaxEventsOnCleanup)
        : 0;
      if (remove > 0)
        this.$realtime.find('.block').slice(0, remove).remove();

      console.log('cleanup discussion "'+this._id()+'", with '+length+' length, '+remove+' removed');

      if (this.model.get('focused'))
        this.scrollDown();
    },
    updateMoment: function() {
      if (!this.model.get('focused')) // only on currently focused view
        return;

      // @todo : reactive update Moment
      // Update all .moment of the discussion panel
      //this.$el.find('.moment').slice(-100).momentify();
    },
    scrollDown: function() {
      // too early calls (router) will trigger scrollbar generation
      // on scrollTo and make everything explode
      if (!this.scrollReady)
        return;

      if (!this.model.get('focused'))
        return;

      var that = this;
      _.delay(function() {
        that.$el.mCustomScrollbar('update');
        that.$el.mCustomScrollbar('scrollTo', 'bottom');
        if (!that.model.get('focused'))
          that.$el.mCustomScrollbar('disable');
      }, 100);
    },
    onFocus: function(model, value, options) {
      if (value) {
        console.log('enable '+this._id());
        this.scrollDown();
        this.updateMoment();
      } else {
        // remove scrollbar listener on blur
        this.$el.mCustomScrollbar('disable');
        console.log('disabled '+this._id());
      }
    },
    addFreshEvent: function(model) {
      // render a 'fresh' event in realtime and scrolldown
      this._start();
      var needToScrollDown = this.scrollBottom; // scrollDown only if already on bottom before DOM insertion
      var previousElement = this.$realtime.find('.block:last').first();
      var newBlock = this._newBlock(model, previousElement);
      var html = this._renderEvent(model, newBlock);
      var element;
      if (!newBlock)
        element = $(html).appendTo(previousElement.find('.items')); // @bug : element is the .event in this case not the .block
      else
        element = $(html).appendTo(this.$realtime);

      if (needToScrollDown)
        this.scrollDown();

      this._stop(1);
    },
    addBatchEvents: function(events, callType) {
      callType = callType || 'history'; // connect/reconnect/history
      if (events.length == 0) {
        return;
      }

      // render a batch of events (sorted in 'desc' order)
      this._start();
      var $html = $('<div/>');
      var previousElement;
      var that = this;
      _.each(events, function(event) {
        var model = new EventModel(event);
        var newBlock = that._newBlock(model,  previousElement);
        var h = that._renderEvent(model, newBlock);
        if (!newBlock)
          $(h).prependTo(previousElement.find('.items')); // not define previousElement, remain the same .block
        else
          previousElement = $(h).prependTo($html);
      });

      if (callType == 'history') {
        $html.css('background-color', 'blue');
        $html.prependTo(this.$history);
      } else if (callType == 'connect') {
        $html.css('background-color', 'red');
        $html.appendTo(this.$history);
      } else {
        $html.appendTo(this.$realtime);
      }
      this._stop(events.length);
    },
    _newBlock: function(newModel, previousElement) {
      var newBlock = false;
      if (!previousElement || previousElement.length < 1) {
        newBlock = true;
      } else {
        switch (newModel.getGenericType()) {
          case 'standard':
            newBlock = true;
            break;
          case 'inout':
            if (!previousElement.hasClass('inout'))
              newBlock = true;
            break;
          case 'message':
            if (!previousElement.hasClass('message') || previousElement.data('username') != newModel.get('data').username)
              newBlock = true;
            break;
        }
      }
      return newBlock;
    },
    _prepareEvent: function(model) {
      var data = model.toJSON();
      var message = model.get('data').message;

      // avatar
      var size = (model.getGenericType() != 'inout')
        ? 30
        : 20;
      if (model.get("data").avatar || model.get("data").color)
        data.data.avatar = $.cd.userAvatar(model.get("data").avatar, size, model.get("data").color);
      if (model.get("data").by_avatar || model.get("data").by_avatar)
        data.data.by_avatar = $.cd.userAvatar(model.get("data").by_avatar, size, model.get("data").by_color);

      if (message) {
        // escape HTML
        message = _.escape(message);

        // mentions
        if (this.model.get('type') == 'room') {
          message = message.replace(
            /@\[([^\]]+)\]\(user:([^)]+)\)/g,
            '<a class="mention open-user-profile" data-username="$1" data-colorify-text="color" data-colorify="'+this.model.get('color')+'">@$1</a>'
          );
        }

        // linkify
        var o = (this.model.get('color'))
          ? { linkAttributes: { style: 'color: '+this.model.get('color')+';' } }
          : {};
        message = $.linkify(message, o);

        // smileys
        message = $.smilify(message);

        data.data.message = message;
      }

      // moment
      var dateObject = moment(model.get('time'));
      data.data.fromnow = dateObject.fromNow();
      data.data.full = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");

      // rendering attributes
      data.isNew = model.get('new');

      return data;
    },
    _renderEvent: function(model, withBlock) {
      var data = this._prepareEvent(model);
      data.withBlock = withBlock || false;
      try {
        return this.eventTemplate(data);
      } catch (e) {
        console.log('Render exception, see below');
        console.log(e);
        return false;
      }
    },
    askHistory: function(event) {
      event.preventDefault();
      event.stopPropagation();

      // noise protection
      if (this.historyLoading)
        return;
      else
        this.historyLoading = true;

      // spinner
      this.$el.find('.history-loader .spinner').show();

      // since
      var first = this.$history
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1)
        ? null
        : first.data('time');

      // @todo : cleanup this code, call on model for example
      if (this.model.get('type') == 'room')
        client.roomHistory(this.model.get('name'), since, '');
      else if (this.model.get('type') == 'onetoone')
        client.userHistory(this.model.get('username'), since, '');
    },
    onHistoryEvents: function(data) {
      this.addBatchEvents(data, 'history');
      this.historyLoading = false;
      this.$scrollable.find('.history-loader .spinner').hide();
    }
  });

  return EventsView;
});