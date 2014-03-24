$(function() {

    window.Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    window.Chat.OneToOne = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                unread: 0
            };
        },

        initialize: function() {
            this.messages = new window.Chat.MessagesCollection();
        },

        focus: function() {
            this.trigger('focus');
        }

    });

    window.Chat.OneToOnesCollection = Backbone.Collection.extend({

        model: window.Chat.OneToOne,

        initialize: function() {
            this.listenTo(window.Chat.main.server, 'messageFromUser', this.oneToOneMessage);
        },

        oneToOneMessage: function(params) {
            // @todo
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */



});