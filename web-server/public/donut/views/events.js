define([
  'jquery',
  'underscore',
  'backbone',
  'models/event',
  'moment',
  'views/window',
  'text!templates/events.html',
  'text!templates/event/disconnected.html',
  'text!templates/event/in-out-on-off.html',
  'text!templates/event/message.html',
  'text!templates/event/reconnected.html',
  'text!templates/event/room-deop.html',
  'text!templates/event/room-kick.html',
  'text!templates/event/room-op.html',
  'text!templates/event/room-topic.html'
], function ($, _, Backbone, EventModel, moment, windowView, eventsTemplate,
             disconnectedTemplate, inOutOnOffTemplate, messageTemplate, reconnectedTemplate,
             deopTemplate, kickTemplate, opTemplate, topicTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),

    eventTemplates: '',

    events: {
      "scroll": "onScroll"
    },

    historyLoading: false,

    historyNoMore: false,

    topListener: false,

    keepMaxEventsOnCleanup: 500,

    initialize: function(options) {
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);

      // @todo : move _.template() in a centralized object (actually it's done for each discussion)
      this.eventTemplates = {
        disconnected    : _.template(disconnectedTemplate),
        inoutonoff      : _.template(inOutOnOffTemplate),
        message         : _.template(messageTemplate),
        reconnected     : _.template(reconnectedTemplate),
        deop            : _.template(deopTemplate),
        kick            : _.template(kickTemplate),
        op              : _.template(opTemplate),
        topic           : _.template(topicTemplate)
      };

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

      this.$scrollable  = this.$el.find('.scrollable');
      this.$blank       = this.$scrollable.find('.blank');
      this.$realtime    = this.$scrollable.find('.realtime');

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
      if (!this.historyNoMore) {
        this.toggleHistoryLoader('loading');
        var that = this;
        this.topListener = setTimeout(function() {
          if (that.$el.scrollTop() <= 0)
            that.requestHistory('top');
        }, 1500);
      }
    },
    isScrollOnBottom: function() {
      var contentHeight = this.$scrollable.outerHeight(true);
      var viewportHeight = this.$el.height();
      var difference = (contentHeight - viewportHeight) - 10; // add a 10px margin
      return (this.$el.scrollTop() >= difference); // if gte current position, we are on bottom
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

      var targetTop = this.$el.find('.loader').position().top;
      this.$el.scrollTop(targetTop);
    },


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
        this.$el.height(heigth);
      else // was called by view itself to adapt .blank height, get the current .events height
        heigth = this.$el.height();

      // blank heigth
      var blankHeight = 0;
      var currentContentHeight = this.$el.find('.hello.block').outerHeight() + this.$realtime.outerHeight();
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
            template = this.eventTemplates['disconnected']; break;
          case 'user:online':
          case 'user:offline':
          case 'room:in':
          case 'room:out':
            template = this.eventTemplates['inoutonoff']; break;
          case 'room:message':
          case 'user:message':
            template = this.eventTemplates['message']; break;
          case 'reconnected':
            template = this.eventTemplates['reconnected']; break;
          case 'room:deop':
            template = this.eventTemplates['deop']; break;
          case 'room:kick':
            template = this.eventTemplates['kick']; break;
          case 'room:':
            template = this.eventTemplates['op']; break;
          case 'room:topic':
            template = this.eventTemplates['topic']; break;
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

        if (scrollTo == 'top') // on manual request
          that.scrollTop();
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
      this.$el.find('.loader').find('.help, .loading, .no-more').hide();
      if (more === 'loading') {
          // 'loading'
        this.$el.find('.loader .loading').show();
      } else if (more) {
        // 'scroll to display more'
        this.$el.find('.loader .help').show();
      } else {
        // no more history indication
        this.$el.find('.loader .no-more').show();
      }
    }

  });

  return EventsView;
});