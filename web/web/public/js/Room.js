$(function() {

    window.Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    window.Chat.Room = Backbone.Model.extend({

        defaults: function() {
            return {
                // room
                room_id: '',
                name: '',
                baseline: '',
                users: [],
                unread: 0
            };
        },

        initialize: function() {
            this.users = new window.Chat.UsersCollection();
            this.messages = new window.Chat.MessagesCollection();
        },

        focus: function() {
            this.trigger('focus');
        }

    });

    window.Chat.RoomsCollection = Backbone.Collection.extend({

        model: window.Chat.Room,

        initialize: function() {

            this.listenTo(window.Chat.main.server, 'room:pleaseJoin', this.joinRoom);
            this.listenTo(window.Chat.main.server, 'room:pleaseLeave', this.leaveRoom);
            this.listenTo(window.Chat.main.server, 'room:joinSuccess', this.joinSuccess);
            this.listenTo(window.Chat.main.server, 'room:userIn', this.userIn);
            this.listenTo(window.Chat.main.server, 'room:userOut', this.userOut);
            this.listenTo(window.Chat.main.server, 'room:baseline', this.changeBaseline);
            this.listenTo(window.Chat.main.server, 'room:message', this.roomMessage);

        },

        joinRoom: function(params) {
            window.Chat.main.server.subscribe(params.topic);
        },

        leaveRoom: function(params) {
            window.Chat.main.server.unsubscribe(params.topic);
        },

        joinSuccess: function(params) {

            var newRoomId = params.data.room_id;

            // Create room in browser
            this.add(new window.Chat.Room({
                id: newRoomId,
                name: params.data.name,
                baseline: params.data.baseline
            }));

            var room = this._targetRoom(newRoomId);

            // Add user in the room
            _.each(params.data.users, function(element, key, list) {
                room.users.add(new window.Chat.User({
                    id: element.user_id,
                    username: element.username,
                    avatar: element.avatar
                }));
            });

            // @todo : how to focus room from here
            //this.focus(params.data.id);
        },

        _targetRoom: function(room_id) {
            return this.get(room_id);
        },

        userIn: function(params) {
            var room = this._targetRoom(params.data.room_id);

            room.users.add(new window.Chat.User({
                id: params.data.user_id,
                username: params.data.username,
                avatar: params.data.avatar
            }));
        },

        userOut: function(params) {
            console.log('tu peux pas test');
            console.log(params.data);
            var room = this._targetRoom(params.data.room_id);
            console.log(room.users.get(params.data.user_id));
            var user = room.users.get(params.data.user_id);
            room.users.remove(user);
        },

        changeBaseline: function(params) {
            var room = this._targetRoom(params.data.room_id);
        },

        roomMessage: function(params) {
            var room = this._targetRoom(params.data.room_id);
            room.messages.add(new window.Chat.Message(params.data)); // i pass everything, maybe not ideal
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    window.Chat.RoomsView = Backbone.View.extend({

        $roomsTabContainer: $("#rooms-list"),
        $roomsWindowContainer: $("#chat-center"),

        initialize: function() {
            // Binds on Rooms
            this.listenTo(window.Chat.main.rooms, 'add', this.addRoom);
        },

        addRoom: function(room) {
            // Create room tab
            var viewItem = new window.Chat.RoomTabView({model: room});
            this.$roomsTabContainer.append(viewItem.render().el);

            // Create room window
            var viewRoom = new window.Chat.RoomView({model: room});
            this.$roomsWindowContainer.append(viewRoom.render().el);
        }

    });

    window.Chat.RoomTabView = Backbone.View.extend({

        template: _.template($('#rooms-list-item-template').html()),

        events: {
            "click .close": "closeThisRoom",
            "click": "focusThisRoom"
        },

        initialize: function() {
            this.listenTo(window.Chat.main.rooms, 'remove', this.removeRoom);
            this.listenTo(this.model, 'focus', this.focus);
            this.listenTo(window.Chat.main.server, 'message', this.addMessage);
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
            window.Chat.main.rooms.remove(this.model); // remove model from collection
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

    window.Chat.RoomView = Backbone.View.extend({

        tagName: 'div',
        className: 'cwindow',

        template: _.template($('#room-template').html()),

        userTemplate: _.template($('#user-template').html()),

        messageTemplate: _.template($('#message-template').html()),

        events: {
//            "click .close": "close",
//            "click": "focus"
        },

        initialize: function() {
            this.listenTo(window.Chat.main.rooms, 'remove', this.removeRoom);
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

//        close: function () {
//            Chat.conversations.remove(this.model); // remove model from collection
//        },

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

//            var newUserItem = $(roomUsers).find(".user-item[data-template='true']").clone(false);
//            $(newUserItem).removeAttr('data-template');
//            $(newUserItem).attr('data-user-id', user.id);
//            $(newUserItem).css('display', 'block');
//            $(newUserItem).find('.username').html(user.username);
//            $(roomUsers).find(".list-group").append(newUserItem);
//
//            userListSort(topic);
//
//            if (undefined == notify || notify != false) {
//                roomContainerAddApplicationMessage(topic, 'info', "User <strong>"+user.username+"</strong> has joined the room");
//            }
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

});