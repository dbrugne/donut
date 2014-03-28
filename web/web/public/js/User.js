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
            'click .user-item': 'openSelected' // @todo
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
        },

        openSelected: function(event) {
            var user_id = $(event.currentTarget).data('userId');
            Chat.main.userProfileModal(user_id);
        }

    });

    Chat.userProfileModal = Backbone.View.extend({

        el: $('#user-profile-modal'),

        events: {
            'hidden.bs.modal': 'teardown'
        },

        show: function(user_id) {
            if (user_id == undefined || user_id == '') {
                return;
            }

            this.$el.modal({
                remote: 'http://' + window.location.hostname + '/u/'+user_id+'?modal=true'
            });
        },

        hide: function() {
            this.$el.modal('hide');
        },

        teardown: function() {
            this.$el.data('modal', null);
            this.remove();
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
            var user_id = $(event.currentTarget).data('userId');
            Chat.main.userProfileModal(user_id);
            this.hide();
        }

    });

});