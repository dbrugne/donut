$(function() {

    Chat = window.Chat || { };

    Chat.Message = Backbone.Model.extend({

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

    Chat.MessagesCollection = Backbone.Collection.extend({

        model: Chat.Message

    });

});