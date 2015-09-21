'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'libs/donut-debug',
  'libs/keyboard',
  'common',
  'models/event',
  'moment',
  'i18next',
  'client',
  'models/current-user',
  'views/events-viewed',
  'views/events-history',
  'views/events-spam',
  'views/events-edit',
  'views/window',
  '_templates'
], function ($, _, Backbone, app, donutDebug, keyboard, common, EventModel, moment, i18next, client, currentUser, EventsViewedView, EventsHistoryView, EventsSpamView, EventsEditView, windowView, templates) {
  var debug = donutDebug('donut:events');

  var EventsView = Backbone.View.extend({
    template: templates['events.html'],

    events: {
      'click .go-to-top a': 'scrollTop',
      'click .go-to-bottom a': 'scrollDown'
    },

    scrollTopTimeout: null,

    scrollVisibleTimeout: null,

    scrollWasOnBottom: true, // ... before unfocus (scroll position is not
                             // available when discussion is hidden (default:
                             // true, for first focus)

    initialize: function () {
      this.listenTo(this.model, 'change:focused', this.onFocusChange);
      this.listenTo(this.model, 'windowRefocused', this.onScroll);
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'messageSent', this.scrollDown);
      this.listenTo(client, 'admin:message', this.onAdminMessage);

      this.render();

      this.eventsViewedView = new EventsViewedView({
        el: this.$scrollable,
        model: this.model
      });

      this.eventsHistoryView = new EventsHistoryView({
        el: this.$el,
        model: this.model
      });

      this.eventsSpamView = new EventsSpamView({
        el: this.$el,
        model: this.model
      });

      this.eventsEditView = new EventsEditView({
        el: this.$el,
        model: this.model
      });

      this.listenTo(this.eventsHistoryView, 'addBatchEvents', _.bind(function (data) {
        this.addBatchEvents(data.history, data.more);
      }, this));
      this.listenTo(app, 'scrollDown', _.bind(function () {
        this.scrollDown();
      }, this));
    },
    render: function () {
      // render view
      var modelJson = this.model.toJSON();
      if (modelJson.owner) {
        modelJson.owner = modelJson.owner.toJSON();
      }
      var created_at = (modelJson.created_at) 
        ? moment(this.model.get('created_at')).format('Do MMMM YYYY, h:mm:ss') 
        : '';
      var html = this.template({
        model: modelJson,
        created_at: created_at,
        isOwner: (this.model.get('type') === 'room' && this.model.currentUserIsOwner()),
        time: Date.now()
      });
      this.$el.append(html);

      this.$scrollable = this.$el;
      this.$scrollableContent = this.$scrollable.find('.scrollable-content');
      this.$realtime = this.$scrollableContent.find('.realtime');

      this.$goToTop = this.$el.find('.go-to-top');
      this.$goToBottom = this.$el.find('.go-to-bottom');

      var that = this;
      this.$scrollable.on('scroll', $.proxy(function () {
        that.onScroll();
      }, this));

      this.scrollDown();
    },
    _remove: function () {
      this.eventsViewedView.remove();
      this.eventsHistoryView.remove();
      this.eventsSpamView.remove();
      this.eventsEditView._remove();
      this._scrollTimeoutCleanup();
      this.remove();
    },
    onFocusChange: function () {
      if (this.model.get('focused')) {
        if (this.scrollWasOnBottom) {
          // will trigger visible element detection implicitly
          this.scrollDown();
        } else {
          this.onScroll();
        }
        this.scrollWasOnBottom = false;
      } else {
        // persist scroll position before hiding
        this.scrollWasOnBottom = this.isScrollOnBottom();
      }
    },
    isVisible: function () {
      return !(!this.model.get('focused') || !windowView.focused);
    },

    /** ***************************************************************************************************************
     *
     * Scroll methods
     *
     *****************************************************************************************************************/

    onScroll: function () {
      // cleanup scroll timeout
      this._scrollTimeoutCleanup();

      var currentScrollPosition = this.$scrollable.scrollTop();
      var bottom = this._scrollBottomPosition();

      // toggle the "go to top and bottom" links
      if (bottom > 100) { // content should be longer than 100px of viewport to avoid link display for
        // few pixels
        if (currentScrollPosition < 30) {
          this.$goToTop.hide();
        } else {
          this.$goToTop.show();
        }
        // possible performance issue
        if (currentScrollPosition >= (bottom - 10)) {
          this.$goToBottom.hide().removeClass('unread');
        } else {
          this.$goToBottom.show();
        }
      } else {
        // nothing to scroll, hide links
        this.$goToBottom.hide().removeClass('unread');
        this.$goToTop.hide();
      }

      var that = this;

      // hit the top and history could be loaded, setTimeout
      if (currentScrollPosition <= 0 && !this.eventsHistoryView.getHistoryNoMore()) {
        this.eventsHistoryView.toggleHistoryLoader('loading');
        this.scrollTopTimeout = setTimeout(function () {
          if (that.$scrollable.scrollTop() <= 0) {
            that.eventsHistoryView.requestHistory('top');
          }
        }, 1500);
      }

      // everywhere
      this.scrollVisibleTimeout = setTimeout(function () {
        // scroll haven't change until timeout
        if (that.$scrollable.scrollTop() === currentScrollPosition) {
          if (that.isVisible()) {
            that.eventsViewedView.markVisibleAsViewed();
          }
        }
      }, 2000);
    },
    _scrollTimeoutCleanup: function () {
      if (this.scrollTopTimeout) {
        clearInterval(this.scrollTopTimeout);
        this.scrollTopTimeout = null;
      }
      if (this.scrollVisibleTimeout) {
        clearInterval(this.scrollVisibleTimeout);
        this.scrollVisibleTimeout = null;
      }
    },
    _scrollBottomPosition: function () {
      var contentHeight = this.$scrollableContent.outerHeight(true);
      var viewportHeight = this.$scrollable.height();
      return contentHeight - viewportHeight;
    },
    isScrollOnBottom: function () {
      var scrollMargin = 10;
      if (this.messageUnderEdition) {
        scrollMargin = this.messageUnderEdition.$el.height();
      }

      // add a 10px margin
      var bottom = this._scrollBottomPosition() - scrollMargin;

      // if get current position, we are on bottom
      return (this.$scrollable.scrollTop() >= bottom);
    },
    scrollDown: function () {
      var bottom = this._scrollBottomPosition();
      this.$scrollable.scrollTop(bottom);
    },
    scrollTop: function () {
      var targetTop = this.eventsHistoryView.getLoaderTop();
      this.$scrollable.scrollTop(targetTop); // add a 8px margin
    },

    /** **************************************************************************************************************
     *
     * Events rendering
     *
     *****************************************************************************************************************/
    onAdminMessage: function (data) {
      data = {data: data};
      data.data.avatar = '//res.cloudinary.com/roomly/image/upload/v1409643461/rciev5ubaituvx5bclnz.png'; // @todo : add avatar URL in configuration
      data.data.username = 'DONUT';
      data.data.is_admin = true;
      data.type = 'room:message';
      var model = new EventModel(data);
      this.addFreshEvent(model);
    },
    addFreshEvent: function (model) {
      // browser notification
      if (model.getGenericType() === 'message' || model.get('type') === 'room:topic') {
        app.trigger('unviewedMessage', model, this.model);
      } else if (this.model.get('type') === 'room' && model.getGenericType() === 'inout') {
        app.trigger('unviewedInOut', model, this.model);
      }

      // render a 'fresh' event in realtime and scrolldown
      debug.start('discussion-events-fresh-' + this.model.getIdentifier());
      // scrollDown only if already on bottom before DOM insertion
      var needToScrollDown = (
        (this.model.get('focused') === true && this.isScrollOnBottom()) ||
        (this.model.get('focused') === false && this.scrollWasOnBottom)
      );
      var previousElement = this.$realtime.find('.block:last').first();
      var newBlock = this._newBlock(model, previousElement);
      var html = this._renderEvent(model, newBlock);
      if (!newBlock) {
        // @bug : element is the .event in this case not the .block
        $(html).appendTo(previousElement.find('.items'));
      } else {
        $(html).appendTo(this.$realtime);
      }

      if (needToScrollDown && !this.messageUnderEdition) {
        this.scrollDown();
      } else {
        this.$goToBottom.show().addClass('unread');
      }

      debug.end('discussion-events-fresh-' + this.model.getIdentifier());
    },
    _prepareEvent: function (model) {
      var data = model.toJSON();
      data.data = _.clone(model.get('data'));

      // spammed & edited
      if (model.getGenericType() === 'message') {
        data.spammed = (model.get('spammed') === true);
        data.edited = (model.get('edited') === true);
      }

      // avatar
      var size = (model.getGenericType() !== 'inout')
        ? 30
        : 20;
      if (model.get('data').avatar) {
        data.data.avatar = common.cloudinarySize(model.get('data').avatar, size);
      }
      if (model.get('data').by_avatar) {
        data.data.by_avatar = common.cloudinarySize(model.get('data').by_avatar, size);
      }

      var message = data.data.message;
      if (message) {
        // prepare
        message = common.markupToHtml(message, {
          template: templates['markup.html'],
          style: 'color: ' + this.model.get('color')
        });

        message = $.smilify(message);

        data.data.message = message;
      }

      var topic = data.data.topic;
      if (topic) {
        // prepare
        topic = common.markupToHtml(topic, {
          template: templates['markup.html'],
          style: 'color: ' + this.model.get('color')
        });

        topic = $.smilify(topic);

        data.data.topic = topic;
      }

      // images
      if (data.data.images) {
        var images = [];
        _.each(data.data.images, function (i) {
          images.push({
            url: common.cloudinarySize(i, 1500, 'limit'),
            thumbnail: common.cloudinarySize(i, 50, 'fill')
          });
        });

        if (images && images.length > 0) {
          data.data.images = images;
        }
      }

      // date
      var dateObject = moment(model.get('time'));
      var diff = (Date.now() - dateObject.valueOf()) / 1000;
      var format;
      if (diff <= 86400) {
        format = 'HH:mm'; // 24h
      } else if (diff <= 604800) {
        format = 'dddd'; // 7 days
      } else if (2592000) {
        format = 'DD/MM'; // 1 month
      } else {
        format = 'MM/YYYY'; // more than 1 year
      }
      data.data.dateshort = dateObject.format(format);
      data.data.datefull = dateObject.format('dddd Do MMMM YYYY à HH:mm:ss');

      // rendering attributes
      data.unviewed = !!model.get('unviewed');

      return data;
    },
    _newBlock: function (newModel, previousElement) {
      var newBlock = false;
      if (!previousElement || previousElement.length < 1) {
        newBlock = true;
      } else {
        switch (newModel.getGenericType()) {
          case 'standard':
            newBlock = true;
            break;
          case 'inout':
            if (!previousElement.hasClass('inout')) {
              newBlock = true;
            }
            break;
          case 'message':
            if (!previousElement.hasClass('message') || previousElement.data('userId') !== newModel.get('data').user_id) {
              newBlock = true;
            }
            break;
        }
      }
      return newBlock;
    },
    addBatchEvents: function (events) {
      if (events.length === 0) {
        return;
      }

      // render a batch of events (sorted in 'desc' order)
      debug.start('discussion-events-batch-' + this.model.getIdentifier());
      var $html = $('<div/>');
      var previousModel;
      var previousElement;
      var now = moment();
      now.second(0).minute(0).hour(0);
      _.each(events, _.bind(function (event) {
        var model = new EventModel(event);
        var newBlock = this._newBlock(model, previousElement);

        // inter-date block
        if (previousModel) {
          var newTime = moment(model.get('time'));
          var previousTime = moment(previousModel.get('time'));
          if (!newTime.isSame(previousTime, 'day')) {
            previousTime.second(0).minute(0).hour(0);
            var dateFull = (moment().diff(previousTime, 'days') === 0
                ? i18next.t('chat.message.today')
                : (moment().diff(previousTime, 'days') === 1
                  ? i18next.t('chat.message.yesterday')
                  : (moment().diff(previousTime, 'days') === 2
                    ? i18next.t('chat.message.the-day-before')
                    : moment(previousModel.get('time')).format('dddd Do MMMM YYYY')
                )
              )
            );

            var dateHtml = templates['event/date.html']({
              time: previousModel.get('time'),
              datefull: dateFull
            });
            previousElement = $(dateHtml).prependTo($html);
            newBlock = true;
          }
        }

        // render and insert
        var h = this._renderEvent(model, newBlock);
        if (!newBlock) {
          // not define previousElement, remain the same .block
          $(h).prependTo(previousElement.find('.items'));
        } else {
          previousElement = $(h).prependTo($html);
        }
        previousModel = model;
      }, this));

      $html.find('>.block').prependTo(this.$realtime);
      debug.end('discussion-events-batch-' + this.model.getIdentifier());
    },
    _renderEvent: function (model, withBlock) {
      var data = this._prepareEvent(model);
      data.withBlock = withBlock || false;
      try {
        var template;
        switch (data.type) {
          case 'disconnected':
            template = templates['event/disconnected.html'];
            break;
          case 'user:online':
          case 'user:offline':
          case 'room:in':
          case 'room:out':
            template = templates['event/in-out-on-off.html'];
            break;
          case 'ping':
            template = templates['event/ping.html'];
            break;
          case 'room:message':
          case 'user:message':
            template = templates['event/message.html'];
            break;
          case 'reconnected':
            template = templates['event/reconnected.html'];
            break;
          case 'room:deop':
            template = templates['event/room-deop.html'];
            break;
          case 'room:kick':
            template = templates['event/room-kick.html'];
            break;
          case 'room:ban':
            template = templates['event/room-ban.html'];
            break;
          case 'room:deban':
            template = templates['event/room-deban.html'];
            break;
          case 'room:voice':
            template = templates['event/room-voice.html'];
            break;
          case 'room:devoice':
            template = templates['event/room-devoice.html'];
            break;
          case 'room:op':
            template = templates['event/room-op.html'];
            break;
          case 'room:topic':
            template = templates['event/room-topic.html'];
            break;
          case 'user:ban':
            template = templates['event/user-ban.html'];
            break;
          case 'user:deban':
            template = templates['event/user-deban.html'];
            break;
          case 'command:help':
            template = templates['event/help.html'];
            break;
          default:
            return;
        }
        return template(data);
      } catch (e) {
        debug('Render exception, see below');
        debug(e);
        return false;
      }
    },

    requestHistory: function (scrollTo) {
      this.eventsHistoryView.requestHistory(scrollTo);
    }
  });

  return EventsView;
});
