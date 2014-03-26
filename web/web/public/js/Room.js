$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.Room = Backbone.Model.extend({

        defaults: function() {
            return {
                // room
                name: '',
                baseline: '',
                users: [],
                unread: 0
            };
        },

        initialize: function() {
            this.users = new Chat.UsersCollection();
            this.messages = new Chat.MessagesCollection();

            this.on('remove', this.unsubscribe);
        },

        unsubscribe: function(model, collection, options) {
            Chat.server.unsubscribe('ws://chat.local/room#'+model.get('id'));
        },

        focus: function() {
            this.trigger('focus');
        }

    });

    Chat.RoomsCollection = Backbone.Collection.extend({

        model: Chat.Room,

        initialize: function() {

            this.listenTo(Chat.server, 'room:pleaseJoin', this.joinRoom);
            this.listenTo(Chat.server, 'room:pleaseLeave', this.leaveRoom);
            this.listenTo(Chat.server, 'room:joinSuccess', this.joinSuccess);
            this.listenTo(Chat.server, 'room:userIn', this.userIn);
            this.listenTo(Chat.server, 'room:userOut', this.userOut);
            this.listenTo(Chat.server, 'room:baseline', this.changeBaseline);
            this.listenTo(Chat.server, 'room:message', this.roomMessage);

        },

        _targetRoom: function(room_id) {
            return this.get(room_id);
        },

        joinRoom: function(params) {
            Chat.server.subscribe(params.topic);
        },

        leaveRoom: function(params) {
            var room = this._targetRoom(params.data.room_id);
            this.remove(room);
        },

        joinSuccess: function(params) {

            var newRoomId = params.data.room_id;

            // Create room in browser
            this.add(new Chat.Room({
                id: newRoomId,
                name: params.data.name,
                baseline: params.data.baseline
            }));

            var room = this._targetRoom(newRoomId);

            // Add user in the room
            _.each(params.data.users, function(element, key, list) {
                room.users.add(new Chat.User({
                    id: element.user_id,
                    username: element.username,
                    avatar: element.avatar
                }));
            });

            // @todo : how to focus room from here
            //this.focus(params.data.id);
        },

        userIn: function(params) {
            var room = this._targetRoom(params.data.room_id);

            room.users.add(new Chat.User({
                id: params.data.user_id,
                username: params.data.username,
                avatar: params.data.avatar
            }));
        },

        userOut: function(params) {
            var room = this._targetRoom(params.data.room_id);
            var user = room.users.get(params.data.user_id);
            room.users.remove(user);
        },

        changeBaseline: function(params) {
            var room = this._targetRoom(params.data.room_id);
        },

        roomMessage: function(params) {
            var room = this._targetRoom(params.data.room_id);
            room.messages.add(new Chat.Message(params.data)); // i pass everything, maybe not ideal
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.RoomsView = Backbone.View.extend({

        $roomsTabContainer: $("#rooms-list"),
        $roomsWindowContainer: $("#chat-center"),

        initialize: function() {
            // Binds on Rooms
            this.listenTo(Chat.rooms, 'add', this.addRoom);
        },

        addRoom: function(room) {
            // Create room tab
            var viewItem = new Chat.RoomTabView({model: room});
            this.$roomsTabContainer.append(viewItem.render().el);

            // Create room window
            var viewRoom = new Chat.RoomView({model: room});
            this.$roomsWindowContainer.append(viewRoom.render().el);
        }

    });

    Chat.RoomTabView = Backbone.View.extend({

        template: _.template($('#rooms-list-item-template').html()),

        events: {
            "click .close": "closeThisRoom",
            "click": "focusThisRoom"
        },

        initialize: function() {
            this.listenTo(Chat.rooms, 'remove', this.removeRoom);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(Chat.server, 'message', this.addMessage);
        },

        removeRoom: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);
            return this;
        },

        closeThisRoom: function (event) {
            event.stopPropagation();
            Chat.rooms.remove(this.model); // remove model from collection
        },

        focusThisRoom: function(event) {
            this.model.focus();
        },

        focus: function() {
            $("#rooms-list .room-item").removeClass('active');
            this.$el.find('.room-item').addClass('active');
        },

        addMessage: function(params) {
            // @todo
            // If current focused room
            // return
            // Else increment badge
        }

    });

    Chat.RoomView = Backbone.View.extend({

        tagName: 'div',
        className: 'cwindow',

        template: _.template($('#room-template').html()),

        userTemplate: _.template($('#user-template').html()),

        messageTemplate: _.template($('#message-template').html()),

        events: {
            "click .close": "closeThisRoom"
        },

        initialize: function() {
            this.listenTo(Chat.rooms, 'remove', this.removeRoom);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(this.model.users, 'add', this.renderUsers);
            this.listenTo(this.model.users, 'remove', this.renderUsers);
            this.listenTo(this.model.messages, 'add', this.addMessage);
        },

        removeRoom: function(model) {
            if (model === this.model) {
                this.remove();
            }
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);
            return this;
        },

        closeThisRoom: function (event) {
            event.stopPropagation();
            Chat.rooms.remove(this.model); // remove model from collection
        },

        focus: function() {
            $("#chat-center .cwindow").hide();
            this.$el.fadeIn(400);
        },

        renderUsers: function(user) {
            var html = this.userTemplate({
                users: _.sortBy(this.model.users.toJSON(), 'username')
            });
            this.$el.find('.room-users .list-group').html(html);

            return this;
        },

        addMessage: function(message) {

            // Date
            var dateText = $.format.date(new Date(message.get('time')*1000), "HH:mm:ss");

            // Message body
            var messageHtml = message.get('message');
            messageHtml = messageHtml.replace(/\n/g, '<br />');

            // Hyperlinks (URLs starting with http://, https://, or ftp://)
            urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            // Smileys
//            $(smileys).each(function (idx, smiley) {
//                messageHtml = messageHtml.replace(smiley.symbol, '<span class="smiley emoticon-16px '+smiley.class+'">'+smiley.symbol+'</span>');
//            });

            var html = this.messageTemplate({
                user_id: message.get('user_id'),
                avatar: message.get('avatar'),
                username: message.get('username'),
                message: messageHtml,
                date: dateText
            });
            this.$el.find('.messages').append(html);

//            scrollDown($(".cwindow[data-topic='"+topic+"'] > .messages"));

            return this;
        }

    });

    Chat.searchRoomModal = Backbone.View.extend({

        el: $('#room-search-modal'),

        template: _.template($('#room-search-modal-template').html()),

        events: {
            'click .room-search-submit': 'search',
            'keyup .room-search-input': 'search',
            'click .rooms-list li': 'openSelected'
        },

        initialize: function() {
            this.listenTo(Chat.server, 'searchSuccess', this.searchSuccess);
            this.listenTo(Chat.server, 'searchError', this.searchError);

            this.search();
        },

        show: function() {
            this.$el.modal('show');
        },

        hide: function() {
            this.$el.modal('hide');
        },

        render: function(rooms) {
            var html = this.template({
                rooms: rooms
            });
            this.$el.find('.rooms-list').first().html(html);

            return this;
        },

        search: function() {
            var search = this.$el.find('.room-search-input').first().val();

            // call RPC + render
            Chat.server.searchForRooms(search);
        },

        searchSuccess: function(results) {
            this.render(results.rooms);
        },

        searchError: function() {
            // @todo : implement error-callback in DOM
            console.error('Error on searchForRooms call');
        },

        openSelected: function(event) {
            var topic = $(event.currentTarget).data('topic');
            Chat.server.subscribe(topic);

            this.hide();
        }

    });

});