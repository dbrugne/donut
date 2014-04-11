$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.MainView = Backbone.View.extend({

        el: $("#chat"),

        currentUser: '',

        events: {
            'click #search-room-link': 'searchRoomModal',
            'click #create-room-link': 'createRoomModal',
            'click #search-user-link': 'searchUserLink'
        },

        initialize: function() {
            // Status view
            this.statusView = new Chat.StatusView({model: Chat.server});

            // Discussions view
            this.discussionsView = new Chat.DiscussionsView({collection: Chat.discussions});

            // Online users block
            this.usersBlock = new Chat.OnlineUsersView({collection: new Chat.OnlineUsersCollection()});

            // Modals (reusable)
            this.createRoomModalView = new Chat.CreateRoomModal();
            this.searchRoomModalView = new Chat.SearchRoomModal();
            this.searchUserModalView = new Chat.SearchUserModal();
            this.userProfileModalView = new Chat.UserProfileModal();

            // Window view
            this.windowView = new Chat.WindowView();

            // Server (user identity)
            var that = this;
            this.listenTo(Chat.server, 'welcome', function(data) {
                that.currentUser = new Chat.User(data);
                this.currentUsername = data.username;
                this.currentAvatar = data.avatar;
                _.each(data.rooms, function(room) {
                    console.log('join this: '+room);
                    Chat.server.join(room);
                });
                // @todo : open rooms
            });
        },

        searchRoomModal: function() {
            this.searchRoomModalView.search();
            this.searchRoomModalView.show();
        },

        createRoomModal: function() {
            this.createRoomModalView.show();
        },

        searchUserLink: function() {
            this.searchUserModalView.search();
            this.searchUserModalView.show();
        },

        userProfileModal: function(user_id) {
            this.userProfileModalView.show(user_id);
        }

    });

});