$(function() {

    window.Chat = window.Chat || { };

    window.Chat.User = Backbone.Model.extend({

        defaults: function() {
            return {
                user_id: '',
                username: '',
                avatar: '',
                unread: 0
            };
        }

    });

    window.Chat.UsersCollection = Backbone.Collection.extend({

        model: window.Chat.User

    });

});