$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.OneToOne = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                unread: 0
            };
        },

        initialize: function() {
            this.messages = new Chat.MessagesCollection();
        },

        focus: function() {
            this.trigger('focus');
        }

    });

    Chat.OneToOnesCollection = Backbone.Collection.extend({

        model: Chat.OneToOne,

        initialize: function() {
            this.listenTo(Chat.connection, 'messageFromUser', this.oneToOneMessage);
        },

        oneToOneMessage: function(params) {
            // @todo
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */



});