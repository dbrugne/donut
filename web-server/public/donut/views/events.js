define([
  'jquery',
  'underscore',
  'backbone',
  'models/event',
  'moment',
  'views/window',
  'text!templates/events.html',
  'text!templates/event.html'
], function ($, _, Backbone, EventModel, moment, windowView, eventsTemplate, eventTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),
    eventTemplate: _.template(eventTemplate),

    events: {
      "click .history-loader a.more": "askHistory"
    },

    historyLoading: false,

    firstHistoryLoaded: false,

    scrollReady: false,

    scrollPosition: '',

    interval: null,

    intervalDuration: 45, // seconds

    keepMaxEventsOnCleanup: 500,

    initialize: function(options) {
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'historyEvents', this.onHistoryEvents);
      this.listenTo(this.model, 'reconnectEvents', this.onReconnectEvents);

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
      this.debug(num+' event(s) rendered in '+this._id()+' ('+_duration+'ms)');
      this.start = 0;
    },
    _remove: function() {
      clearInterval(this.interval);
      this.$el.mCustomScrollbar('destroy');
      this.remove();
    },
    debug: function(message) {
      // @todo TEMP TEMP TEMP
      //return console.log('[events='+this._id()+'] '+message);
    },
    render: function() {
      // render view
      var html = this.template({
        model: this.model.toJSON(),
        time: Date.now()
      });
      this.$el.append(html);

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
          updateOnSelectorChange: false,
          updateOnContentResize: false,
          updateOnImageLoad: false
        },
        callbacks:{
          onTotalScroll: function() {
            that.scrollPosition = 'bottom';
          },
          onTotalScrollBack: function() {
            that.scrollPosition = 'top';
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
      this.$blank = this.$scrollable.find('.blank');

      // render events received on 'connect' (in .history)
      if (this.model.get('connectHistory')) {
        var connectHistory = this.model.get('connectHistory');
        if (connectHistory.history && connectHistory.history.length > 0) {
          this.addBatchEvents(connectHistory.history, connectHistory.more, 'connect');
          this.toggleHistoryMore(connectHistory.more);
        }
        this.model.set('connectHistory', null);
      }

      this.scrollDown();
    },
    cleanup: function(event) {
      if (this.model.get('focused') && this.scrollPosition != 'bottom')
        return; // no action when focused AND scroll not on bottom

      var hl = this.$history.find('.block').length;
      var rl = this.$realtime.find('.block').length;

      if ((hl + rl) < 250) // not enough content, no need to cleanup
        return this.debug('cleanup '+this._id()+ ' not enough event to cleanup: '+(hl + rl));

      // @todo : only when a certain amount of content OR when history is not visible on scroll position

      // cleanup .history
      this.$history.empty();
      this.toggleHistoryMore(true);

      // cleanup .realtime
      var length = this.$realtime.find('.block').length;
      var remove = (length > this.keepMaxEventsOnCleanup)
        ? (length - this.keepMaxEventsOnCleanup)
        : 0;
      if (remove > 0)
        this.$realtime.find('.block').slice(0, remove).remove();

      this.debug('cleanup discussion "'+this._id()+'", with '+length+' length, '+remove+' removed');

      if (this.model.get('focused'))
        this.scrollDown();
    },
    updateMoment: function() {
      if (!this.model.get('focused') || !this.$realtime) // only on currently focused view
        return;

      // Update all .moment of the discussion panel
      this.$realtime.find('.moment').slice(this.keepMaxEventsOnCleanup*-1).momentify();
      this.debug('moment updated');
      // @todo : find a better logic than .slice() to scope elements
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
      }, 100);
    },
    _focus: function() {
      this.updateMoment();
    },
    resize: function(heigth) {
      this.$el.height(heigth);
      if (this.$blank) {
        var blankHeight = 0;
        var currentContentHeight = this.$scrollable.find('.hello.block').outerHeight()
          + this.$history.outerHeight()
          + this.$realtime.outerHeight();
        if (currentContentHeight > heigth)
          blankHeight = 0;
        else
          blankHeight = heigth - currentContentHeight;

        this.$blank.height(blankHeight);
        //console.log('blank', blankHeight);
      }
      this.scrollDown();
    },
    addFreshEvent: function(model) {
      // browser notification
      if (model.getGenericType() == 'message')
        windowView.triggerMessage(model, this.model);
      else if (this.model.get('type') == 'room' && model.getGenericType() == 'inout')
        windowView.triggerInout(model, this.model);

      // render a 'fresh' event in realtime and scrolldown
      this._start();
      // scrollDown only if already on bottom before DOM insertion
      var needToScrollDown = (this.scrollPosition == '' || this.scrollPosition == 'bottom')
        ? true
        : false;
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
      else
        this.$el.mCustomScrollbar('update'); // just update

      this._stop(1);
    },
    addBatchEvents: function(events, more, callType) {
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
        $html.prependTo(this.$history);
      } else if (callType == 'connect') {
        $html.appendTo(this.$history);
      } else if (callType == 'reconnect') {
        $html.appendTo(this.$realtime);
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
      data.data = _.clone(model.get('data'));
      var message = data.data.message;

      // avatar
      var size = (model.getGenericType() != 'inout')
        ? 30
        : 20;
      if (model.get("data").avatar)
        data.data.avatar = $.cd.userAvatar(model.get("data").avatar, size);
      if (model.get("data").by_avatar)
        data.data.by_avatar = $.cd.userAvatar(model.get("data").by_avatar, size);

      if (message) {
        // escape HTML
        message = _.escape(message);

        // linkify (before other decoration, will escape HTML)
        var o = (this.model.get('color'))
          ? { linkAttributes: { style: 'color: '+this.model.get('color')+';' } }
          : {};
        message = $.linkify(message, o);

        // mentions
        if (this.model.get('type') == 'room') {
          message = message.replace(
            /@\[([^\]]+)\]\(user:([^)]+)\)/g,
            '<a class="mention open-user-profile" data-username="$1" style="color: '+this.model.get('color')+'">@$1</a>'
          );
        }

        // smileys
        message = $.smilify(message);

        data.data.message = message;
      }

      // images
      if (data.data.images) {
        var images = [];
        _.each(data.data.images, function(i) {
          i.url = $.cd.natural(i.path);
          i.thumbnail = $.cd.natural(i.path, 50, 50); // @important: use .path to obtain URL with file extension and avoid CORS errors
          images.push(i);
        });

        if (images && images.length > 0)
          data.data.images = images;
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
        this.debug('Render exception, see below');
        this.debug(e);
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

      this.model.history(since);
    },
    onHistoryEvents: function(data) {
      this.addBatchEvents(data.history, data.more, 'history');

      if (!this.firstHistoryLoaded) {
        // history is load a first time on first discussion focus, could happen
        // before view is totaly ready and should reposition the scrollbar on bottom
        this.firstHistoryLoaded = true;
        this.scrollDown();
        return;
      }

      this.historyLoading = false;
      this.$scrollable.find('.history-loader .spinner').hide();
      this.toggleHistoryMore(data.more);
    },
    toggleHistoryMore: function(w) {
      if (w) {
        // true: display 'more' link
        this.$scrollable.find('.history-loader .more').show();
        this.$scrollable.find('.history-loader .no-more').hide();
      } else {
        // else: display no more history indication
        this.$scrollable.find('.history-loader .more').hide();
        this.$scrollable.find('.history-loader .no-more').show();
      }
    },
    onReconnectEvents: function(history) {
      // @todo : very optimistic approach, we base our logic on the 250 last events (what's happen for a reconnect after few hours of deconnection??)

      // render events received on 'reconnect' (in .realtime)
      var history = this.model.get('reconnectHistory');
      if (!history || !history.history || history.history.length < 0)
        return;

      var lastElement = this.$realtime.find('.event[data-time]:last').first();
      var lastEventTs;
      if (lastElement.length < 1) // else try to find in .history (important!)
        lastElement = this.$history.find('.event[data-time]:last').first();
      var lastEventTs = (lastElement.length > 0)
        ? lastElement.data('time')
        : false;

      var firstEvent = _.last(history.history); // history is given sorted 'desc'
      var firstEventTs = (firstEvent && firstEvent.data && firstEvent.data.time)
        ? firstEvent.data.time
        : false;

      this.debug('last in dom: '+lastEventTs+' <?> '+firstEventTs+' first received ('+(lastEventTs<firstEventTs)+')');

      // need to filter events (last element in DOM is more ancient that first element in history
      var filtered;
      this.debug('reconnect '+history.history.length);
      // no need to filter
      if (firstEventTs === false || lastEventTs === false || lastEventTs < firstEventTs) {
        this.debug('no need to filter');
        filtered = history.history;
      } else {
        // only events greater than last element timestamp
        this.debug('filter the list');
        filtered = _.filter(history.history, function(event) {
          if (event.data.time > lastEventTs)
            return true;
          else
            return false;
        });
      }
      this.debug('reconnect '+filtered.length);

      this.addBatchEvents(filtered, history.more, 'reconnect');
      this.model.set('reconnectHistory', null);
    }

  });

  return EventsView;
});