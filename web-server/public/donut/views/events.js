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
  'views/message-edit',
  'views/window',
  '_templates'
], function ($, _, Backbone, app, donutDebug, keyboard, common, EventModel, moment, i18next, client, currentUser, MessageEditView, windowView, templates) {
  var debug = donutDebug('donut:events');

  var EventsView = Backbone.View.extend({
    template: templates['events.html'],

    events: {
      'click .go-to-top a': 'scrollTop',
      'click .go-to-bottom a': 'scrollDown',
      'shown.bs.dropdown .actions': 'onMessageMenuShow',
      'click .dropdown-menu .spammed': 'onMarkAsSpam',
      'click .dropdown-menu .unspam': 'onUnmarkAsSpam',
      'click .view-spammed-message': 'onViewSpammedMessage',
      'click .remask-spammed-message': 'onRemaskSpammedMessage',
      'click .dropdown-menu .edited': 'onEditMessage',
      'dblclick .event': 'onEditMessage',
      'keydown .form-message-edit': 'onPrevOrNextFormEdit'
    },

    historyLoading: false,

    historyNoMore: false,

    scrollTopTimeout: false,
    scrollVisibleTimeout: false,

    scrollWasOnBottom: true, // ... before unfocus (scroll position is not available when discussion is hidden (default: true, for first focus)

    keepMaxEventsOnCleanup: 500,

    initialize: function () {
      this.listenTo(this.model, 'change:focused', this.onFocusChange);
      this.listenTo(this.model, 'windowRefocused', this.onScroll);
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'viewed', this.onViewed);
      this.listenTo(this.model, 'messageSpam', this.onMarkedAsSpam);
      this.listenTo(this.model, 'messageUnspam', this.onMarkedAsUnspam);
      this.listenTo(this.model, 'messageEdit', this.onMessageEdited);
      this.listenTo(this.model, 'editMessageClose', this.onEditMessageClose);
      this.listenTo(this.model, 'cleanup', this.cleanup);
      this.listenTo(this.model, 'clearHistory', this.onClearHistory);
      this.listenTo(this.model, 'messageSent', this.scrollDown);
      this.listenTo(this.model, 'editPreviousInput', this.pushUpFromInput);
      this.listenTo(client, 'admin:message', this.onAdminMessage);

      debug.start('discussion-events' + this.model.getIdentifier());
      this.render();
      debug.end('discussion-events' + this.model.getIdentifier());
    },
    render: function () {
      // render view
      var html = this.template({
        model: this.model,
        time: Date.now()
      });
      this.$el.append(html);

      this.$scrollable = this.$el;
      this.$scrollableContent = this.$scrollable.find('.scrollable-content');
      this.$pad = this.$scrollableContent.find('.pad');
      this.$loader = this.$scrollableContent.find('.loader');
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
      this._scrollTimeoutCleanup();
      this.remove();
    },
    onFocusChange: function () {
      if (this.model.get('focused')) {
        if (this.scrollWasOnBottom) {
          // will trigger markVisibleAsViewed() implicitly
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
      if (bottom > 100) { // content should be longer than 100px of viewport to avoid link display for few pixels
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
      if (currentScrollPosition <= 0 && !this.historyNoMore) {
        this.toggleHistoryLoader('loading');
        this.scrollTopTimeout = setTimeout(function () {
          if (that.$scrollable.scrollTop() <= 0) {
            that.requestHistory('top');
          }
        }, 1500);
      }

      // everywhere
      this.scrollVisibleTimeout = setTimeout(function () {
        if (that.$scrollable.scrollTop() === currentScrollPosition) {
          // scroll haven't change until timeout
          that.markVisibleAsViewed();
        }
      }, 2000);

    },
    _scrollTimeoutCleanup: function () {
      if (this.scrollTopTimeout) {
        clearInterval(this.scrollTopTimeout);
        this.scrollTopTimeout = false;
      }
      if (this.scrollVisibleTimeout) {
        clearInterval(this.scrollVisibleTimeout);
        this.scrollVisibleTimeout = false;
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
        scrollMargin = this.messageUnderEdition.$el.height(); // @todo yls this logic is really needed? Are you sure this is not needed only for "last" .event edition and not for all event edition?
      }

      var bottom = this._scrollBottomPosition() - scrollMargin; // add a 10px margin
      return (this.$scrollable.scrollTop() >= bottom); // if get current position, we are on bottom
    },
    scrollDown: function () {
      var bottom = this._scrollBottomPosition();
      this.$scrollable.scrollTop(bottom);
    },
    scrollTop: function () {
      var targetTop = this.$loader.position().top;
      this.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
    },

    /** **************************************************************************************************************
     *
     * Visible elements detection
     *
     *****************************************************************************************************************/
    computeVisibleElements: function (callback) {
      var start = Date.now();

      var contentHeight = this.$scrollableContent.height();
      var topLimit = this.$scrollable.offset().top;
      var bottomLimit = topLimit + this.$scrollable.height();

      var $items = this.$scrollableContent.find('.block.message .event.unviewed, .block.topic .event.unviewed');
      if (!$items.length) {
        return debug('Not enough .event.unviewed to compute visible elements');
      }
      $items.removeClass('visible topElement bottomElement first big'); // @debug

      // find the first visible element
      var $firstVisibleElement, firstVisibleIndex, $nextElement, $previousElement;
      var candidateIndex = Math.floor(topLimit * $items.length / contentHeight); // optimistic way to find -in theory- the closest
      var $candidateElement = $items.eq(candidateIndex);
      var visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $candidateElement);
      debug($candidateElement.attr('id') + ' vib:', visibility);
      if (visibility === 'ok') {
        $firstVisibleElement = $candidateElement;
        firstVisibleIndex = candidateIndex;
        debug('we have visible element on first try');
      } else if (visibility === 'big') {
        // mark $candidateElement as top and stop
        $firstVisibleElement = $candidateElement;
        firstVisibleIndex = candidateIndex;
        debug('first is big');

      } else if (visibility === 'next') {
        var _visibility;
        // loop to find next 'ok'
        for (var nextIndex = candidateIndex + 1; nextIndex < $items.length; nextIndex++) {
          $nextElement = $items.eq(nextIndex);
          _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $nextElement);
          if (_visibility === 'ok' || _visibility === 'big') {
            $firstVisibleElement = $nextElement;
            firstVisibleIndex = nextIndex;
            debug('$topCandidate found in next loop', $firstVisibleElement);
            break;
          } else {
            $candidateElement = $nextElement;
            candidateIndex = nextIndex;
          }
        }

      } else if (visibility === 'previous') {
        // loop to find previous 'ok'
        for (var previousIndex = candidateIndex - 1; previousIndex >= 0; previousIndex--) {
          $previousElement = $items.eq(previousIndex);
          _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $previousElement);
          if (_visibility === 'ok' || _visibility === 'big') {
            $firstVisibleElement = $previousElement;
            firstVisibleIndex = previousIndex;
            break;
          } else {
            $candidateElement = $previousElement;
            candidateIndex = previousIndex;
          }
        }

      } else {
        // heu??
        debug(visibility, 'heu');
      }

      // no element is fully visible
      if (!$firstVisibleElement) {
        debug('no element fully visible found');
        return callback([]);
      }

      // decorate list
      $firstVisibleElement.addClass('first');
      var $elements = this._listFullyVisibleElementsInViewport(topLimit, bottomLimit, $items, $firstVisibleElement, firstVisibleIndex);
      $elements[0].addClass('topElement');
      $elements[($elements.length - 1)].addClass('bottomElement');
      var visibleElementIds = [];
      $.each($elements, function () {
        $(this).addClass('visible');
        visibleElementIds.push($(this).attr('id'));
      });

      var duration = Date.now() - start;
      debug('Current scroll position is ' + (topLimit - 5) + '/' +
        (contentHeight - this.$scrollable.height()) +
        ' ... (in ' + duration + 'ms)');

      return callback(visibleElementIds);
    },
    _isElementFullyVisibleInViewport: function (topLimit, bottomLimit, $e) {
      var elementTop = $e.offset().top;
      var elementBottom = elementTop + $e.outerHeight();

      var v = '';
      if (elementTop <= topLimit && elementBottom >= bottomLimit) {
        // top is above topLimit && bottom is under bottomLimit => big element
        $e.addClass('big');
        v = 'big';
      } else if (elementTop >= bottomLimit) {
        // element is fully under viewport => find previous
        v = 'previous';
      } else if (elementTop > topLimit && elementBottom > bottomLimit) {
        // top is under topLimit && bottom is under bottomLimit => search for previous
        v = 'previous';
      } else if (elementBottom <= topLimit) {
        // element is fully above viewport => search for next
        v = 'next';
      } else if (elementTop <= topLimit) {
        // top is above topLimit => search for next
        v = 'next';
      } else if (elementTop > topLimit && elementBottom <= bottomLimit) {
        // top is under topLimit && bottom is above bottomLimit => ok
        v = 'ok';
      } else {
        v = 'error';
      }
      return v;
    },
    _listFullyVisibleElementsInViewport: function (topLimit, bottomLimit, $items, $element, index) {
      // determine fully visible element before and after $firstVisibleElement
      var list = [];
      list.push($element);

      var $e, v;

      // loop backward
      for (var previousIndex = index - 1; previousIndex >= 0; previousIndex--) {
        $e = $items.eq(previousIndex);
        v = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $e);
        if (v === 'ok') {
          list.unshift($e);
        } else {
          break;
        }
      }

      // loop forward
      for (var nextIndex = index + 1; nextIndex < $items.length; nextIndex++) {
        $e = $items.eq(nextIndex);
        v = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $e);
        if (v === 'ok') {
          list.push($e);
        } else {
          break;
        }
      }

      return list;
    },

    /** ***************************************************************************************************************
     *
     * Size & cleanup
     *
     *****************************************************************************************************************/
    cleanup: function (everything) {
      everything = everything || false;
      var howToRemove;

      // determine if needed
      if (!everything) {
        if (this.isVisible() && !this.isScrollOnBottom()) {
          // no action when focused AND scroll not on bottom
          return;
        }

        var realtimeLength = this.$realtime.find('.block').length;
        if (realtimeLength < 250) {
          // not enough content, no need to cleanup
          return debug('cleanup ' + this.model.getIdentifier() +
            ' not enough event to cleanup: ' + realtimeLength);
        }

        // how many elements to remove
        howToRemove = (realtimeLength > this.keepMaxEventsOnCleanup) ?
          (realtimeLength - this.keepMaxEventsOnCleanup) :
          false;

        if (!howToRemove) {
          return debug('cleanup ' + this.model.getIdentifier() +
            ' not events to cleanup: ' + realtimeLength);
        }
      }

      // reset history loader
      this.toggleHistoryLoader(true);

      // cleanup .realtime
      if (everything) {
        debug('cleanuped "' + this.model.getIdentifier() + '" (all removed)');
        this.$realtime.empty();
      } else {
        this.$realtime.find('.block').slice(0, howToRemove).remove();
        debug('cleanuped "' + this.model.getIdentifier() + '" (' + realtimeLength + ' length, ' + howToRemove + ' removed)');
      }

      if (this.isVisible()) {
        this.scrollDown();
      }
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
            var dateFull = (moment().diff(previousTime, 'days') === 0 ?
                i18next.t('chat.message.today') :
                (moment().diff(previousTime, 'days') === 1 ?
                    i18next.t('chat.message.yesterday') :
                    (moment().diff(previousTime, 'days') === 2 ?
                        i18next.t('chat.message.the-day-before') :
                        moment(previousModel.get('time')).format('dddd Do MMMM YYYY')
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
    _prepareEvent: function (model) {
      var data = model.toJSON();
      data.data = _.clone(model.get('data'));

      // spammed & edited
      if (model.getGenericType() === 'message') {
        data.spammed = (model.get('spammed') === true);
        data.edited = (model.get('edited') === true);
      }

      // avatar
      var size = (model.getGenericType() !== 'inout') ? 30 : 20;
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
          case 'room:me':
          case 'user:message':
          case 'user:me':
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

    /** ***************************************************************************************************************
     *
     * Viewed management
     *
     *****************************************************************************************************************/
    markVisibleAsViewed: function () {
      if (!this.isVisible()) {
        // scroll could be triggered by freshevent event when window is not focused
        return debug('markVisibleAsViewed: discussion/window not focused, do nothing');
      }

      var that = this;
      this.computeVisibleElements(function (elements) {
        that.viewedElements(elements);
      });
    },
    viewedElements: function (elements) {
      if (elements.length) {
        this.model.viewedElements(elements);
      }
    },
    onViewed: function (data) {
      if (!data.events || !data.events.length) {
        return;
      }

      var selector = '';
      _.each(data.events, function (id) {
        if (selector !== '') {
          selector += ', ';
        }
        selector += '#' + id;
      });

      $(selector).removeClass('unviewed');
    },
    isVisible: function () {
      return !(!this.model.get('focused') || !windowView.focused);
    },

    /** ***************************************************************************************************************
     *
     * Message actions menu
     *
     *****************************************************************************************************************/
    onMessageMenuShow: function (event) {
      var ownerUserId = '';
      var $event = $(event.currentTarget).closest('.event');
      if (this.model.get('owner')) {
        ownerUserId = this.model.get('owner').get('user_id');
      }
      var userId = $event.closest('[data-user-id]').data('userId');
      var isMessageOwner = (ownerUserId === userId);

      var isEditable = this.isEditableMessage($event);

      if (this.model.get('type') === 'room') {
        var isOp = this.model.currentUserIsOp();
        var isOwner = this.model.currentUserIsOwner();
        var isAdmin = this.model.currentUserIsAdmin();
      }

      if (((!isOwner && !isAdmin && !isOp) || (isOp && isMessageOwner)) && (!isEditable)) {
        $(event.currentTarget).find('.dropdown-menu').dropdown('toggle');
        return;
      }
      var html = templates['events-dropdown.html']({
        data: {
          isOp: isOp,
          isOwner: isOwner,
          isAdmin: isAdmin,
          isMessageOwner: isMessageOwner,
          isEditable: isEditable
        }
      });
      $(event.currentTarget).find('.dropdown-menu').html(html);
    },
    onMarkAsSpam: function (event) {
      event.preventDefault();
      var parent = $(event.currentTarget).closest('.event');
      var roomId = this.model.get('id');
      var messageId = parent.attr('id');

      client.roomMessageSpam(roomId, messageId);
    },
    onUnmarkAsSpam: function (event) {
      event.preventDefault();
      var parent = $(event.currentTarget).closest('.event');
      var roomId = this.model.get('id');
      var messageId = parent.attr('id');
      parent.removeClass('viewed');

      var ctn = parent.find('.text') || parent.find('.image');
      ctn.find('.remask-spammed-message').remove();

      client.roomMessageUnspam(roomId, messageId);
    },
    onMarkedAsSpam: function (room) {
      var bottom = this.isScrollOnBottom();
      this.$('#' + room.event)
        .addClass('spammed')
        .find('.ctn')
        .first()
        .append('<div class="text-spammed">' + i18next.t('chat.message.text-spammed') + '</div>');
      if (bottom) {
        this.scrollDown();
      }
    },
    onMarkedAsUnspam: function (room) {
      var bottom = this.isScrollOnBottom();
      this.$('#' + room.event)
        .removeClass('spammed')
        .find('.ctn .text-spammed')
        .remove();

      this.$('#' + room.event).find('.remask-spammed-message').remove();
      if (bottom) {
        this.scrollDown();
      }
    },
    onViewSpammedMessage: function (event) {
      var bottom = this.isScrollOnBottom();
      event.preventDefault();
      var parent = $(event.currentTarget).closest('.event');
      var textSpammed = $(event.currentTarget).closest('.text-spammed');
      var ctn = parent.children('.ctn');
      parent.removeClass('spammed').addClass('viewed');
      textSpammed.remove();

      ctn.prepend('<a class="remask-spammed-message label label-danger">' + i18next.t('chat.message.text-remask') + '</a>');

      if (bottom) {
        this.scrollDown();
      }
    },
    onRemaskSpammedMessage: function (event) {
      var bottom = this.isScrollOnBottom();
      event.preventDefault();
      var parent = $(event.currentTarget).closest('.event');
      var ctn = parent.children('.ctn');
      parent.addClass('spammed').removeClass('viewed');
      parent
        .find('.ctn')
        .first()
        .append('<div class="text-spammed">' + i18next.t('chat.message.text-spammed') + '</div>');

      ctn.find('.remask-spammed-message').remove();

      if (bottom) {
        this.scrollDown();
      }
    },

    /** ***************************************************************************************************************
     *
     * Message edit
     *
     *****************************************************************************************************************/
    onEditMessage: function (event) {
      event.preventDefault();

      var $event = $(event.currentTarget).closest('.event');

      if (!this.isEditableMessage($event)) {
        return;
      }
      this.editMessage($event);
    },
    isEditableMessage: function ($event) {
      var userId = $event.closest('[data-user-id]').data('userId');
      var time = $event.data('time');
      var isMessageCurrentUser = (currentUser.get('user_id') === userId);
      var isNotTooOld = ((Date.now() - new Date(time)) < window.message_maxedittime);
      var isSpammed = $event.hasClass('spammed');

      return (isMessageCurrentUser && isNotTooOld && !isSpammed);
    },
    onPrevOrNextFormEdit: function (event) {
      var direction;
      var bottom = this.isScrollOnBottom();
      var key = keyboard._getLastKeyCode(event);
      if (key.which === keyboard.UP) {
        direction = 'prev';
      } else if (key.which === keyboard.DOWN) {
        direction = 'next';
      } else {
        if (bottom) {
          this.scrollDown();
        }
        return;
      }

      var $currentEventMessage = $(event.currentTarget).closest('.event');
      var $currentBlockMessage = $(event.currentTarget).closest('.message');

      var userId = $currentBlockMessage.data('userId');

      // get sibling .event
      var $candidate = $currentEventMessage[direction]();
      var $candidateBlock = $currentBlockMessage[direction]();

      // no sibling .event, try with sibling .block
      if (!$candidate.length && $candidateBlock.length) {
        var _lastBlock = $candidateBlock;
        while ((_lastBlock.data('userId') !== userId)) {
          if (!_lastBlock[direction]().length) {
            return;
          }
          _lastBlock = _lastBlock[direction]();
        }

        $candidate = (direction === 'prev') ?
          _lastBlock.find('.event').last() :
          _lastBlock.find('.event').first();
      }

      if (this.isEditableMessage($candidate)) {
        this.editMessage($candidate);
      }
      if (bottom) {
        this.scrollDown();
      }
    },
    pushUpFromInput: function () {
      var _lastBlock = this.$realtime.find('.block.message').last();
      while (_lastBlock.data('userId') !== currentUser.get('user_id')) {
        if (!_lastBlock.prev().length) {
          return;
        }
        _lastBlock = _lastBlock.prev();
      }
      var $event = _lastBlock.find('.event').last();
      var bottom = this.isScrollOnBottom();
      if (this.isEditableMessage($event)) {
        this.editMessage($event);
      }
      if (bottom) {
        this.scrollDown();
      }
    },
    editMessage: function ($event) {
      var bottom = this.isScrollOnBottom();
      if (this.messageUnderEdition) {
        this.onEditMessageClose();
      }
      this.messageUnderEdition = new MessageEditView({
        el: $event,
        model: this.model
      });
      if (bottom) {
        this.scrollDown();
      }
    },
    onMessageEdited: function (data) {
      var bottom = this.isScrollOnBottom();
      var $event = this.$('#' + data.event);

      if ($event.find('.text').html() === undefined) {
        $('<div class="text"></div>').insertAfter(this.$('#' + data.event).find('.message-edit'));
      }
      var msg = common.markupToHtml(data.message, {
        template: templates['markup.html'],
        style: 'color: ' + this.model.get('color')
      });
      msg = $.smilify(msg);
      data.message = msg;

      data.message += '<span class="text-edited">&nbsp;(' + i18next.t('chat.message.edition.edited') + ')</span>';
      $event.find('.ctn').find('.text').html(data.message);

      if (bottom) {
        this.scrollDown();
      }
    },
    onEditMessageClose: function () {
      if (!this.messageUnderEdition) {
        return;
      }
      this.messageUnderEdition.remove();
      this.messageUnderEdition = null;
    },
    onClearHistory: function () {
      this.cleanup(true);
    },

    /** ***************************************************************************************************************
     *
     * History management
     *
     *****************************************************************************************************************/
    requestHistory: function (scrollTo) {
      if (this.historyLoading) {
        return;
      }
      this.historyLoading = true;

      this.toggleHistoryLoader('loading');

      // save the current first element identifier
      if (scrollTo === 'top') {
        var $nextTopElement = $('<div class="nextTopPosition"></div>').prependTo(this.$realtime);
      }

      // since
      var first = this.$realtime
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1) ?
        null :
        first.data('time');

      var that = this;
      this.model.history(since, function (data) {
        that.addBatchEvents(data.history, data.more);

        if (scrollTo === 'top') { // on manual request
          var targetTop = $nextTopElement.position().top;
          that.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
          $nextTopElement.remove();
        }

        if (scrollTo === 'bottom') {
          // on first focus history load
          that.scrollDown();
        }
        that.historyLoading = false;
        that.historyNoMore = data.more;
        that.toggleHistoryLoader(data.more);
      });
    },
    toggleHistoryLoader: function (more) {
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
