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

    Chat.UsersBlockView = Backbone.View.extend({

        el: $('#block-users'),

        events: {
        },

        initialize: function() {
            // Subview
            new Chat.OnlineUsersView({
                el: this.$el.find('#online-users-list'),
                collection: new Chat.OnlineUsersCollection()
            });
        },

        render: function() {
            return this;
        },

        openSearchUserModal: function(event) {
            alert('cheap modal');
        }
    });

    Chat.OnlineUsersView = Backbone.View.extend({

        template: _.template($('#online-users-template').html()),

        events: {
            'click .user-item': 'GLOBALACTIONPROFILEMODAL' // @todo
        },

        initialize: function(options) {
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

    Chat.searchUserModal = Backbone.View.extend({

        el: $('#user-search-modal'),

        template: _.template($('#user-search-modal-template').html()),

        events: {
            'click .user-search-submit': 'search',
            'keyup .user-search-input': 'search',
            'click .users-list li': 'openSelected'
        },

        initialize: function() {
            this.listenTo(Chat.server, 'user:searchSuccess', this.searchSuccess);
            this.listenTo(Chat.server, 'user:searchError', this.searchError);
            this.search();
        },

        show: function() {
            this.$el.modal('show');
        },

        hide: function() {
            this.$el.modal('hide');
        },

        render: function(users) {
            var html = this.template({
                users: users
            });
            this.$el.find('.users-list').first().html(html);

            return this;
        },

        search: function() {
            var search = this.$el.find('.user-search-input').first().val();

            // call RPC + render
            Chat.server.searchForUsers(search);
        },

        searchSuccess: function(results) {
            this.render(results.users);
        },

        searchError: function() {
            // @todo : implement error-callback in DOM
            console.error('Error on searchForUsers call');
        },

        openSelected: function(event) {
//            var topic = $(event.currentTarget).data('topic');
//
//            // Is already opened?
//            var room_id = topic.replace('ws://chat.local/room#', '');
//            var room = Chat.rooms.get(room_id);
//            if (room != undefined) {
//                Chat.rooms.focus(room.get('id'));
//
//                // Room not already open
//            } else {
//                Chat.server.subscribe(topic);
//            }
//
//            this.hide();
        }

    });

});