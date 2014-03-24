$(function() {

    window.Chat = window.Chat || { };

     window.Chat.Message = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                username: '',
                avatar: '',
                date: '',
                message: ''
            };
        }

    });

    window.Chat.MessagesCollection = Backbone.Collection.extend({

        model: window.Chat.Message

    });

});