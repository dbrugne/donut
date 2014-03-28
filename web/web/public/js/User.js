$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

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

    Chat.OnlineUsersCollection = Chat.UsersCollection.extend({

        initialize: function() {
            this.listenTo(Chat.server, 'newOnlineUser', this.addUser);
            this.listenTo(Chat.server, 'removeOnlineUser', this.removeUser);
        },

        addUser: function(data) {
            this.add({
                id: data.user_id,
                username: data.username,
                avatar: data.avatar
            });
        },

        removeUser: function(data) {
            var user = this.get(data.user_id);
            if (user == undefined) {
                return;
            }
            this.remove(user);
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.OnlineUsersView = Backbone.View.extend({

        el: $('#online-users-list'),

        template: _.template($('#online-users-template').html()),

        initialize: function() {
            this.listenTo(this.collection, 'add', this.render);
            this.listenTo(this.collection, 'remove', this.render);
            this.render();
        },

        render: function() {
            var html = this.template({
                users: this.collection.toJSON()
            });
            this.$el.html(html);
            return this;
        }
    });


});