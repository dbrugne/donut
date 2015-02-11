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
      "scroll": "onScroll",
      "click .history-loader a.more": "onViewMore"
    },

    historyLoading: false,

    firstHistoryLoaded: false,

    topListener: false,

    keepMaxEventsOnCleanup: 500,

    initialize: function(options) {
      window.debug.start('discussion-events'+this.model.getIdentifier());
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'historyEvents', this.onHistoryEvents);

      this.render();
      window.debug.end('discussion-events'+this.model.getIdentifier());
    },
    _remove: function() {
      if (this.topListener)
        clearInterval(this.topListener);
      this.remove();
    },
    render: function() {
      // render view
      var html = this.template({
        model: this.model.toJSON(),
        time: Date.now()
      });
      this.$el.append(html);

      this.$scrollable = this.$el.find('.scrollable');
      this.$history = this.$el.find('.history');
      this.$realtime = this.$el.find('.realtime');
      this.$blank = this.$el.find('.blank');

      // render events received on 'connect' (in .history)
      if (this.model.get('connectHistory')) {
        var connectHistory = this.model.get('connectHistory');
        if (connectHistory.history && connectHistory.history.length > 0) {
          this.addBatchEvents(connectHistory.history, connectHistory.more, 'connect');
          this.toggleHistoryLoader(connectHistory.more);
        }
        this.model.set('connectHistory', null);
      }

      this.scrollDown();
    },
    onScroll: function(event) {
      // everywhere but the top
      if (this.$el.scrollTop() > 0) {
        if (this.topListener) {
          clearInterval(this.topListener);
          this.topListener = false;
        }
        return;
      }

      // already listening
      if (this.topListener)
        return;

      // hit the top
      this.toggleHistoryLoader('loading');
      var that = this;
      this.topListener = setTimeout(function() {
        if (that.$el.scrollTop() <= 0)
          that.requestHistory();
      }, 1500);
    },
    isScrollOnBottom: function() {
      var contentHeight = this.$scrollable.outerHeight(true);
      var viewportHeight = this.$el.height();
      var difference = (contentHeight - viewportHeight) - 10; // add a 10px margin
      return (this.$el.scrollTop() >= difference); // if gte current position, we are on bottom
    },
    update: function() {
      this.cleanup();
    },
    cleanup: function(event) {
      if (this.model.get('focused') && this.isScrollOnBottom())
        return; // no action when focused AND scroll not on bottom

      var hl = this.$history.find('.block').length;
      var rl = this.$realtime.find('.block').length;

      if ((hl + rl) < 250) // not enough content, no need to cleanup
        return window.debug.log('cleanup '+this.model.getIdentifier()+ ' not enough event to cleanup: '+(hl + rl));

      // @todo : only when a certain amount of content OR when history is not visible on scroll position

      // cleanup .history
      this.$history.empty();
      this.toggleHistoryLoader(true);

      // cleanup .realtime
      var length = this.$realtime.find('.block').length;
      var remove = (length > this.keepMaxEventsOnCleanup)
        ? (length - this.keepMaxEventsOnCleanup)
        : 0;
      if (remove > 0)
        this.$realtime.find('.block').slice(0, remove).remove();

      window.debug.log('cleanup discussion "'+this.model.getIdentifier()+'", with '+length+' length, '+remove+' removed');

      if (this.model.get('focused'))
        this.scrollDown();
    },
    scrollDown: function() {
      if (!this.model.get('focused'))
        return;

      var contentHeight = this.$scrollable.outerHeight(true);
      var viewportHeight = this.$el.height();
      var difference = contentHeight - viewportHeight;
      this.$el.scrollTop(difference);
    },
    scrollTop: function() {
      if (!this.model.get('focused'))
        return;

      var targetTop = this.$el.find('.history-loader').position().top;
      this.$el.scrollTop(targetTop);
    },
    resize: function(heigth) {
      // called by views/discussion (on page resize)
      if (typeof heigth != "undefined")
        this.$el.height(heigth); // resize full events view
      else // called by view itself to adapt .blank height
        heigth = this.$el.height();

      // blank heigth
      var blankHeight = 0;
      var currentContentHeight = this.$el.find('.hello.block').outerHeight()
        + this.$history.outerHeight()
        + this.$realtime.outerHeight();
      if (currentContentHeight > heigth)
        blankHeight = 0;
      else
        blankHeight = heigth - currentContentHeight;
      if (blankHeight < 20)
        blankHeight = 20; // keep always a 20px height to allow scrolling upper that content to trigger history
      this.$blank.height(blankHeight);
      window.debug.log('blank', blankHeight);

      this.scrollDown();
    },
    addFreshEvent: function(model) {
      // browser notification
      if (model.getGenericType() == 'message')
        windowView.triggerMessage(model, this.model);
      else if (this.model.get('type') == 'room' && model.getGenericType() == 'inout')
        windowView.triggerInout(model, this.model);

      // render a 'fresh' event in realtime and scrolldown
      window.debug.start('discussion-events-fresh-'+this.model.getIdentifier());
      // scrollDown only if already on bottom before DOM insertion
      var needToScrollDown = this.isScrollOnBottom();
      var previousElement = this.$realtime.find('.block:last').first();
      var newBlock = this._newBlock(model, previousElement);
      var html = this._renderEvent(model, newBlock);
      var element;
      if (!newBlock)
        element = $(html).appendTo(previousElement.find('.items')); // @bug : element is the .event in this case not the .block
      else
        element = $(html).appendTo(this.$realtime);

      // resize .blank
      this.resize();

      if (needToScrollDown)
        this.scrollDown();

      window.debug.end('discussion-events-fresh-'+this.model.getIdentifier());
    },
    addBatchEvents: function(events, more, callType) {
      callType = callType || 'history'; // connect/reconnect/history
      if (events.length == 0) {
        return;
      }

      // render a batch of events (sorted in 'desc' order)
      window.debug.start('discussion-events-batch-'+this.model.getIdentifier());
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
      window.debug.end('discussion-events-batch-'+this.model.getIdentifier());

      // resize .blank
      this.resize();
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
          i.thumbnail = $.cd.natural(i.path, 50, 50, 'fill'); // @important: use .path to obtain URL with file extension and avoid CORS errors
          images.push(i);
        });

        if (images && images.length > 0)
          data.data.images = images;
      }

      // date
      var dateObject = moment(model.get('time'));
      var diff = (Date.now() - dateObject.valueOf())/1000;
      var format;
      if (diff <= 86400) // 24h
        format = 'HH:mm';
      else if (diff <= 604800) // 7 days
        format = 'dddd';
      else if (2592000) // 1 month
        format = 'DD/MM';
      else // more than 1 year
        format = 'MM/YYYY';
      data.data.dateshort = dateObject.format(format);
      data.data.datefull = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");

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
        window.debug.log('Render exception, see below');
        window.debug.log(e);
        return false;
      }
    },
    requestHistory: function() {
      if (this.historyLoading)
        return;

      this.historyLoading = true;
      this.scrollTopAfterHistory = true;

      this.toggleHistoryLoader('loading');

      // since
      var first = this.$history
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1)
        ? null
        : first.data('time');

      this.model.history(since);
    },
    onViewMore: function(event) {
      event.preventDefault();
      event.stopPropagation();
      this.requestHistory();
    },
    onHistoryEvents: function(data) {
      this.addBatchEvents(data.history, data.more, 'history');

      if (this.scrollTopAfterHistory) // on manual request
        this.scrollTop();
      if (!this.firstHistoryLoaded) // on first focus history load
        this.scrollDown();

      this.historyLoading = false;
      this.scrollTopAfterHistory = false;
      this.firstHistoryLoaded = true;
      this.toggleHistoryLoader(data.more);
    },
    toggleHistoryLoader: function(more) {
      this.$el.find('.history-loader').find('.help, .loading, .no-more').hide();
      if (more === 'loading') {
          // 'loading'
        this.$el.find('.history-loader .loading').show();
      } else if (more) {
        // 'scroll to display more'
        this.$el.find('.history-loader .help').show();
      } else {
        // no more history indication
        this.$el.find('.history-loader .no-more').show();
      }
    }
    //onReconnectEvents: function(history) {
    //  // /!\ too optimistic approach, we base our logic on the 250 last events (what's happen for a reconnect after few hours of deconnection??)
    //
    //  // render events received on 'reconnect' (in .realtime)
    //  var history = this.model.get('reconnectHistory');
    //  if (!history || !history.history || history.history.length < 0)
    //    return;
    //
    //  var lastElement = this.$realtime.find('.event[data-time]:last').first();
    //  var lastEventTs;
    //  if (lastElement.length < 1) // else try to find in .history (important!)
    //    lastElement = this.$history.find('.event[data-time]:last').first();
    //  var lastEventTs = (lastElement.length > 0)
    //    ? lastElement.data('time')
    //    : false;
    //
    //  var firstEvent = _.last(history.history); // history is given sorted 'desc'
    //  var firstEventTs = (firstEvent && firstEvent.data && firstEvent.data.time)
    //    ? firstEvent.data.time
    //    : false;
    //
    //  window.debug.log('last in dom: '+lastEventTs+' <?> '+firstEventTs+' first received ('+(lastEventTs<firstEventTs)+')');
    //
    //  // need to filter events (last element in DOM is more ancient that first element in history
    //  var filtered;
    //  window.debug.log('reconnect '+history.history.length);
    //  // no need to filter
    //  if (firstEventTs === false || lastEventTs === false || lastEventTs < firstEventTs) {
    //    window.debug.log('no need to filter');
    //    filtered = history.history;
    //  } else {
    //    // only events greater than last element timestamp
    //    window.debug.log('filter the list');
    //    filtered = _.filter(history.history, function(event) {
    //      if (event.data.time > lastEventTs)
    //        return true;
    //      else
    //        return false;
    //    });
    //  }
    //  window.debug.log('reconnect '+filtered.length);
    //
    //  this.addBatchEvents(filtered, history.more, 'reconnect');
    //  this.model.set('reconnectHistory', null);
    //}

  });

  return EventsView;
});