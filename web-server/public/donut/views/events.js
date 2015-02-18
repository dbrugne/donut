define([
  'jquery',
  'underscore',
  'backbone',
  'models/event',
  'moment',
  'views/window',
  '_templates'
], function ($, _, Backbone, EventModel, moment, windowView, templates) {
  var EventsView = Backbone.View.extend({

    template: templates['events.html'],

    events: {
      "click .go-to-top a"    : "scrollTop",
      "click .go-to-bottom a" : "scrollDown"
    },

    historyLoading: false,

    historyNoMore: false,

    topListener: false,

    keepMaxEventsOnCleanup: 500,

    initialize: function(options) {
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);

      window.debug.start('discussion-events'+this.model.getIdentifier());

      this.render();
      window.debug.end('discussion-events'+this.model.getIdentifier());
    },
    render: function() {
      // render view
      var html = this.template({
        model: this.model.toJSON(),
        time: Date.now()
      });
      this.$el.append(html);

      this.$scrollable         = this.$el.find('.scrollable');
      this.$scrollableContent  = this.$scrollable.find('.scrollable-content');
      this.$pad                = this.$scrollableContent.find('.pad');
      this.$loader             = this.$scrollableContent.find('.loader');
      this.$blank              = this.$scrollableContent.find('.blank');
      this.$realtime           = this.$scrollableContent.find('.realtime');

      this.$goToTop = this.$el.find('.go-to-top');
      this.$goToBottom = this.$el.find('.go-to-bottom');

      var that = this;
      this.$scrollable.on('scroll', function() {
        that.onScroll();
      });

      this.scrollDown();
    },
    _remove: function() {
      if (this.topListener)
        clearInterval(this.topListener);
      this.remove();
    },

    /*****************************************************************************************************************
     *
     * Scroll methods
     *
     *****************************************************************************************************************/
    onScroll: function(event) {
      var scrollTop = this.$scrollable.scrollTop();
      var bottom = this._scrollBottomPosition();

      // go to top and bottom links
      if (bottom > 100) { // content should be longer than 100px of viewport to avoid link display for few pixels
        if (scrollTop < 30)
          this.$goToTop.hide();
        else
          this.$goToTop.show();
        if (scrollTop >= (bottom - 10)) // possible performance issue
          this.$goToBottom.hide();
        else
          this.$goToBottom.show();
      } else {
        // nothing to scroll, hide links
        this.$goToBottom.hide();
        this.$goToTop.hide();
      }

      // everywhere but the top
      if (scrollTop > 0) {
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
      if (!this.historyNoMore) {
        this.toggleHistoryLoader('loading');
        var that = this;
        this.topListener = setTimeout(function() {
          if (that.$el.scrollTop() <= 0)
            that.requestHistory('top');
        }, 1500);
      }
    },
    _scrollBottomPosition: function() {
      var contentHeight = this.$scrollableContent.outerHeight(true);
      var viewportHeight = this.$scrollable.height();
      return contentHeight - viewportHeight;
    },
    isScrollOnBottom: function() {
      var bottom = this._scrollBottomPosition() - 10; // add a 10px margin
      return (this.$scrollable.scrollTop() >= bottom); // if gte current position, we are on bottom
    },
    scrollDown: function() {
      var bottom = this._scrollBottomPosition();
      this.$scrollable.scrollTop(bottom);
    },
    scrollTop: function() {
      var targetTop = this.$loader.position().top;
      this.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
    },

    /*****************************************************************************************************************
     *
     * Size & cleanup
     *
     *****************************************************************************************************************/
    update: function() {
      this.cleanup();
    },
    cleanup: function(event) {
      if (this.model.get('focused') && this.isScrollOnBottom())
        return; // no action when focused AND scroll not on bottom

      var realtimeLength = this.$realtime.find('.block').length;
      if (realtimeLength < 250) // not enough content, no need to cleanup
        return window.debug.log('cleanup '+this.model.getIdentifier()+ ' not enough event to cleanup: '+realtimeLength);

      // @todo : only when a certain amount of content OR when history is not visible on scroll position

      // reset history loader
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
    resize: function(heigth) {
      var needToScrollDown = this.isScrollOnBottom();

      if (typeof heigth != "undefined") // was called on page resize by views/discussion, set the .events height
        this.$scrollable.height(heigth);
      else // was called by view itself to adapt .blank height, get the current .events height
        heigth = this.$scrollable.height();

      // blank heigth
      var blankHeight = 0;
      var currentContentHeight = this.$loader.outerHeight() + this.$realtime.outerHeight();
      if (currentContentHeight > heigth)
        blankHeight = 0;
      else
        blankHeight = heigth - currentContentHeight;
      this.$blank.height(blankHeight);
      window.debug.log('blank', blankHeight);

      if (needToScrollDown)
        this.scrollDown();
    },

    /*****************************************************************************************************************
     *
     * Events rendering
     *
     *****************************************************************************************************************/
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
    addBatchEvents: function(events, more) {
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

      $html.prependTo(this.$realtime);
      window.debug.end('discussion-events-batch-'+this.model.getIdentifier());

      // resize .blank
      this.resize();
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
    _renderEvent: function(model, withBlock) {
      var data = this._prepareEvent(model);
      data.withBlock = withBlock || false;
      try {
        var template;
        switch (data.type) {
          case 'disconnected':
            template = templates['event/disconnected.html']; break;
          case 'user:online':
          case 'user:offline':
          case 'room:in':
          case 'room:out':
            template = templates['event/in-out-on-off.html']; break;
          case 'room:message':
          case 'user:message':
            template = templates['event/message.html']; break;
          case 'reconnected':
            template = templates['event/reconnected.html']; break;
          case 'room:deop':
            template = templates['event/room-deop.html']; break;
          case 'room:kick':
            template = templates['event/room-kick.html']; break;
          case 'room:ban':
            template = templates['event/room-ban.html']; break;
          case 'room:deban':
            template = templates['event/room-deban.html']; break;
          case 'room:op':
            template = templates['event/room-op.html']; break;
          case 'room:topic':
            template = templates['event/room-topic.html']; break;
          default:
            return;
        }
        return template(data);
      } catch (e) {
        window.debug.log('Render exception, see below');
        window.debug.log(e);
        return false;
      }
    },

    /*****************************************************************************************************************
     *
     * History management
     *
     *****************************************************************************************************************/
    requestHistory: function(scrollTo) {
      if (this.historyLoading)
        return;

      this.historyLoading = true;

      this.toggleHistoryLoader('loading');

      // save the current first element identifier
      if (scrollTo == 'top')
        var $nextTopElement = $('<div class="nextTopPosition"></div>').prependTo(this.$realtime);

      // since
      var first = this.$realtime
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1)
        ? null
        : first.data('time');

      var that = this;
      this.model.history(since, function(data) {
        that.addBatchEvents(data.history, data.more);

        if (scrollTo == 'top') { // on manual request
          var targetTop = $nextTopElement.position().top;
          that.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
          $nextTopElement.remove();
        }

        if (scrollTo == 'bottom') // on first focus history load
          that.scrollDown();

        that.historyLoading = false;

        if (data.more === true)
          that.historyNoMore = false;
        else
          that.historyNoMore = true;
        that.toggleHistoryLoader(data.more);
      });
    },
    toggleHistoryLoader: function(more) {
      this.$loader.find('.help, .loading, .no-more').hide();
      this.$pad.removeClass('loading');
      if (more === 'loading') {
        // 'loading'
        this.$loader.find('.loading').show();
        this.$pad.addClass('loading');
      } else if (more) {
        // 'scroll to display more'
        this.$loader.find('.help').show();
      } else {
        // no more history indication
        this.$loader.find('.no-more').show();
      }
    }

  });

  return EventsView;
});