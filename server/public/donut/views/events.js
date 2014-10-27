define([
  'jquery',
  'underscore',
  'backbone',
  'moment',
  'text!templates/events.html'
], function ($, _, Backbone, moment, eventsTemplate) {
  var EventsView = Backbone.View.extend({

    template: _.template(eventsTemplate),

    events: {},

    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.onEvent);
      this.listenTo(this.model, 'change:focused', this.updateMoment);

      this.render();

      // Regularly update moment times
      var that = this;
      setInterval(function() { that.updateMoment(); }, 45*1000); // every 45s
    },

    render: function() {
      this.$el.scroller();
      this.$scroller = this.$el.find('.scroller-content'); // Scroller will
                          // automatically move content in div.scroller-content
      return this;
    },

    _render: function(event) {
      try {
        return html = this.template(event);
      } catch (e) {
        console.log('Error, render exception, see below');
        console.log(e);
        return false;
      }
    },
    _prepareData: function(model) {
      var json = model.toJSON();
      json.data = model.get('data');

      if (json.data.avatar)
        json.data.avatar = $.cd.userAvatar(json.data.avatar, 30, json.data.color);
      if (json.data.by_avatar)
        json.data.by_avatar = $.cd.userAvatar(json.data.by_avatar, 30, json.data.by_color);

      return json;
    },
    _insert: function(html) {
      var el;
      el = $(html).appendTo(this.$scroller);
      return el;
    },
    _insertBefore: function(html, next) {
      var el;
      if (next.getGenericType() == 'standard') {
        el = $(html).insertBefore(this.$el.find('[data-event-id="'+next.get('id')+'"]'));
      } else {
        el = $(html).insertBefore(this.$el.find('[data-event-id="'+next.get('id')+'"]').closest('.block'));
      }

      return el;
    },
    _insertAfter: function(html, previous) {
      var el;
      if (previous.getGenericType() == 'standard') {
        el = $(html).insertAfter(this.$el.find('[data-event-id="'+previous.get('id')+'"]'));
      } else {
        el = $(html).insertAfter(this.$el.find('[data-event-id="'+previous.get('id')+'"]').closest('.block'));
      }

      return el;
    },
    _insertInBlockBefore: function(html, block, next) {
      var el = $(html).insertBefore($(block).find('[data-event-id="'+next.get('id')+'"]'));
      return el;
    },
    _insertInBlockAfter: function(html, block, previous) {
      var el = $(html).insertAfter($(block).find('[data-event-id="'+previous.get('id')+'"]'));
      return el;
    },

    updateMoment: function() {
      if (!this.model.get('focused')) return;

      // Update all .moment of the discussion panel
      this.$el.find('.moment').momentify();
    },

    scrollDown: function() {
      this.$el
        .scroller('reset')
        .scroller('scroll', this.$scroller.prop('scrollHeight'));
    },

    onEvent: function(model, collection, options) {
      console.log('new event '+model.get('id'));
      if (model.getGenericType() == 'message')
        this.messageEvent(model);
      else if (model.getGenericType() == 'inout')
        this.inoutEvent(model);
      else
        this.standardEvent(model);

      this.scrollDown();
    },

    standardEvent: function(model) {
      // render event html
      var html = this._render(this._prepareData(model));
      if (html === false) return;

      var el;

      // first displayed element
      if (this.collection.length == 1) {
        console.log('insert standard '+model.get('id')+' as first element');
        el = this._insert(html);
      }

      // display after previous
      var previous = this.collection.at(this.collection.indexOf(model) - 1);
      if (!el && previous) {
        console.log('insert standard '+model.get('id')+' after previous '+previous.get('id'));
        el = this._insertAfter(html, previous);
      }

      // display before next
      var next = this.collection.at(this.collection.indexOf(model) + 1);
      if (!el && next) {
        console.log('insert standard '+model.get('id')+' before next '+next.get('id'));
        el = this._insertBefore(html, next);
      }

      if (!el)
        return console.log('logic error ! Unable to find next or previous but not the only one element in collection !!');

      // decorate
      el.find('.moment').momentify();
      if (model.get('id') != 'hello') {
        el.smilify();
        // @todo : color is broken on link
        el.linkify({
          linkAttributes: {
            'data-colorify'      : this.model.get('color') || '',
            'data-colorify-text' : 'color'
          }
        });
        el.colorify(); // after linkify
      }

      return el;
    },

    _findMessageBlock: function(model) {
      var el;

      // return previous message block
      if (this.collection.sameBlockAsPrevious(model)) {
        var previous = this.collection.at(this.collection.indexOf(model) - 1);
        return this.$el.find('.item[data-event-id="'+previous.get('id')+'"]').closest('.items');
      }

      // return next message block
      if (this.collection.sameBlockAsNext(model)) {
        var next = this.collection.at(this.collection.indexOf(model) + 1);
        return this.$el.find('.item[data-event-id="'+next.get('id')+'"]').closest('.items');
      }

      /**
       * @todo : Try to find previous, and previous, and previous (if an event wasn't rendered)
       *
       * @TODO : PISTE !!! Ajouter le timestamp sur chaque .event (item ou block ou standard). Procéder ensuite par dicotomie pour le placer dans le flux !!!
       *   - get first
       *   - get last
       *   - define nearest tail
       *   - loop over and find previous and next
       *   - if previous is same type = insert after
       *   - if not and if next is same type = insert before
       *   - if not create new block and insert between
       */

      // otherwise, insert and return new block
      return this._insertMessageBlock(model);
    },

    _insertMessageBlock: function(model) {
      var html = this._render({type: 'messageBlock', data: model.get('data')});

      var el;

      // first displayed element
      if (this.collection.length == 1) {
        console.log('insert message BLOCK for '+model.get('id')+' as first element');
        el = this._insert(html);
      }

      // display after previous
      var previous = this.collection.at(this.collection.indexOf(model) - 1);
      if (!el && previous) {
        console.log('insert message block for '+model.get('id')+' after previous '+previous.get('id'));
        el = this._insertAfter(html, previous);
      }

      // display before next
      var next = this.collection.at(this.collection.indexOf(model) + 1);
      if (!el && next) {
        console.log('insert message block for '+model.get('id')+' before next '+next.get('id'));
        el = this._insertBefore(html, next);
      }

      if (!el)
        return console.log('logic error ! Unable to find next or previous but not the only one element in collection !!');

      return $(el).find('div.items');
    },

    messageEvent: function(model) {
      // render event html
      var html = this._render(this._prepareData(model));
      if (html === false) return;

      var block = this._findMessageBlock(model);
      if (!block)
        console.log('error with _findMessageBlock, returns '+block);

      console.log('found block is ', block);

      // insert message
      var el;
      if (this.collection.sameBlockAsPrevious(model)) {
        var previous = this.collection.at(this.collection.indexOf(model) - 1);
        el = this._insertInBlockAfter(html, block, previous);
      } else if (this.collection.sameBlockAsNext(model)) {
        var next = this.collection.at(this.collection.indexOf(model) + 1);
        el = this._insertInBlockBefore(html, block, next);
      } else {
        // first item for this block
        el = $(html).appendTo(block);
      }

      console.log('message inserted here: ');
      console.log(el);

      // paste content (XSS protection, insert user content as text)
      // @todo : check if <%- can do the job like for topic
      el.find('.text')
        .text(model.get('data').message+"") // escape content
        .smilify()
        .linkify({
          linkAttributes: {
            'data-colorify': event.data.color,
            'data-colorify-text': 'color'
          }
        });

      // decorate
      el.colorify();

      // update time
      // @todo : edit value
      el.find('.moment').momentify();

      return el;
    },

    inoutEvent: function(model) {
      // render event html
      var html = this._render(this._prepareData(model));
      if (html === false) return;

      var el;
//      // is last is inout block
//      var blockEl;
//      if (this.aggregation.last[where] != 'inout') {
//        // insert inout block
//        var blockHtml = this._render({type: 'inOutBlock'});
//        if (blockHtml === false) return;
//        blockEl = (where == 'top')
//          ? $(blockHtml).prependTo(this.$scroller)
//          : $(blockHtml).appendTo(this.$scroller);
//      } else {
//        // find last block
//        blockEl = (where == 'top')
//          ? this.$el.find('div.event.inout').first()
//          : this.$el.find('div.event.inout').last();
//      }
//
//      // insert item
//      var el = $(html).appendTo($(blockEl).find('.items').first()); // always append to end
//
//      // decorate
////      el.find('.moment').momentify();
//
//      // for next insertion
//      this.aggregation.last[where] = 'inout';
      return el;
    }

  });

  return EventsView;
});