$(function() {

    Chat = window.Chat || { };

    Chat.User = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                username: '',
                avatar: '',
                unread: 0
            };
        }

    });

    Chat.UsersCollection = Backbone.Collection.extend({

        model: Chat.User

    });

});