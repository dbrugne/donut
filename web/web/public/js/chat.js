$(function() {

    // @todo : refactor to allow direct Chat. call in subfiles
    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */



    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    /**
     * Whole interface View
     */
    Chat.MainView = Backbone.View.extend({

        el: $("#chat"),

        events: {
            'click #search-room-link': 'searchRoomModal',
            'click #create-room-link': 'createRoomModal',
            'click #search-user-link': 'searchUserLink'
        },

        initialize: function() {
            //
        },

        run: function() {
            // Status view
            new Chat.StatusView({model: Chat.server});

            // Rooms view
            new Chat.RoomsView({collection: this.rooms});

            // One to ones @todo
//            this.onetoones = new Chat.OneToOnesCollection;
//            new Chat.ConversationsView({collection: this.conversations});

            // Server events
            var that = this;
            this.listenTo(Chat.server, 'userIdentity', function(data) {
                that.currentUser = new Chat.User(data);
            });

            // Connection (only when all IHM are ready)
            Chat.server.connect();
        },

        // @todo : not here, should be in conversationsView
        focus: function(topic) {
            if (!this.conversations.length) {
                return;
            }

            var model;
            if (topic) {
                model = this.conversations.get(topic);
            } else {
                model = this.conversations.first();
            }

            model.focus();
        },

        searchRoomModal: function() {
            if (!('searchRoomModalView' in this)) {
                this.searchRoomModalView = new Chat.searchRoomModal();
            }

            this.searchRoomModalView.show();
        },

        createRoomModal: function() {

        },

        searchUserLink: function() {

        }

    });

});