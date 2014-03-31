$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.Smiley = Backbone.Model.extend({

        defaults: function() {
            return {
                label: '',
                class: '',
                symbol: ''
            };
        }

    });

    Chat.SmileysCollection = Backbone.Collection.extend({

        model: Chat.Smiley

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.SmileysView = Backbone.View.extend({

        tag: 'div',

        className: 'popover top smileys-popover',

        template: _.template($('#smileys-template').html()),

        events: {
            'click li': 'pick'
        },

        initialize: function(options) {
            this.onPick= options.onPick;
            this.render();
        },

        render: function() {
            var html = this.template({ smileys: this.collection.toJSON() });
            this.$el.html(html);
            this.$el.hide();
            $('body').append(this.$el);
            return this;
        },

        pick: function(event) {
            this.$el.hide();
            this.trigger('pick', {
                symbol: $(event.currentTarget).data('symbol'),
                cssclass: $(event.currentTarget).data('sclass')
            });
            return false; // stop propagation
        }

    });

    /* ====================================================== */
    /* ======================  DATA  ======================== */
    /* ====================================================== */

    Chat.smileys = new Chat.SmileysCollection();
    Chat.smileys.add([
        { label: 'smile', class: 'emoticon-smile', symbol: ":)" },
        { label: 'grin', class: 'emoticon-grin', symbol: ":D" },
        { label: 'joy', class: 'emoticon-joy', symbol: ":')" },
        { label: 'wink', class: 'emoticon-wink', symbol: ";)" },
        { label: 'cheeky', class: 'emoticon-cheeky', symbol: ":P" },
        { label: 'surprised', class: 'emoticon-surprised', symbol: ":O" },
        { label: 'kiss', class: 'emoticon-kiss', symbol: ":*" },
        { label: 'frown', class: 'emoticon-frown', symbol: ":(" },
        { label: 'tears', class: 'emoticon-tears', symbol: ":'(" },
        { label: 'cool', class: 'emoticon-cool', symbol: "&gt;B)" },
        { label: 'angry', class: 'emoticon-angry', symbol: ":@" },
        { label: 'confused', class: 'emoticon-confused', symbol: ":S" },
        { label: 'angel', class: 'emoticon-angel', symbol: "O:)" },
        { label: 'devil', class: 'emoticon-devil', symbol: "3:)" },
        { label: 'music', class: 'emoticon-music', symbol: "(8)" },
        { label: 'thumbs-up', class: 'emoticon-thumbs-up', symbol: "(Y)" },
        { label: 'thumbs-down', class: 'emoticon-thumbs-down', symbol: "(N)" },
        { label: 'heart', class: 'emoticon-heart', symbol: "&lt;3" },
        { label: 'broken-heart', class: 'emoticon-broken-heart', symbol: "&lt;/3" }
    ]);

});