$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.Room = Chat.Discussion.extend({

        defaults: function() {
            return {
                room_id: '',
                name: '',
                baseline: '',
                type: 'room',
                focused: false,
                unread: 0
            };
        },

        _initialize: function() {
            this.users = new Chat.UsersCollection();
            this.on('remove', this.unsubscribe);
            this.listenTo(Chat.server, 'room:userIn', this.userIn);
            this.listenTo(Chat.server, 'room:userOut', this.userOut);
            this.listenTo(Chat.server, 'room:baseline', this.baseline);
        },

        unsubscribe: function(model, collection, options) {
            Chat.server.unsubscribe('ws://chat.local/room#'+model.get('room_id'));
        },

        userIn: function(params) {
            if (params.data.room_id != this.get('room_id')) {
                return;
            }
            this.users.add(new Chat.User({
                id: params.data.user_id,
                username: params.data.username,
                avatar: params.data.avatar
            }));
        },

        userOut: function(params) {
            if (params.data.room_id != this.get('room_id')) {
                return;
            }
            var user = this.users.get(params.data.user_id);
            this.users.remove(user);
        },

        baseline: function(params) {
            if (params.data.room_id != this.get('room_id')) {
                return;
            }
            this.set('baseline', params.data.baseline);
            // @todo notif in room
        }

    });

    /* ====================================================== */
    /* ======================  VIEWS  ======================= */
    /* ====================================================== */

    Chat.RoomTabView = Chat.DiscussionTabView.extend({

        template: _.template($('#rooms-list-item-template').html()),

        _initialize: function(options) {
            this.listenTo(this.model.users, 'add', this.updateUsers);
            this.listenTo(this.model.users, 'remove', this.updateUsers);
        },

        _renderData: function() {
            return {
                room: this.model.toJSON(),
                users: this.model.users.toJSON() // users are not an "attribute", but an object properties
            };
        },

        updateUsers: function() {
            this.$el.find('.users-count .count').html(this.model.users.length);
        }

    });

    Chat.RoomWindowView = Chat.DiscussionWindowView.extend({

        template: _.template($('#room-template').html()),

        userTemplate: _.template($('#user-template').html()),

        events: {
            'click .close': 'close',
            'keypress .input-message': 'postMessage',
            'click .send-message': 'postMessage',
            'click .messages > p > .username': function(event) {
                Chat.main.userProfileModal(
                    $(event.currentTarget).data('userId')
                );
            },
            'click .user-profile': function(event) {
                Chat.main.userProfileModal(
                    $(event.currentTarget).closest('.user-item').data('userId')
                );
            },
            'click .user-discussion': function(event) {
                var user_id = $(event.currentTarget).closest('.user-item').data('userId');
                var model = this.collection.openOneToOne(this.model.users.get(user_id));
                this.collection.focus(model);
            }
        },

        _initialize: function() {
            this.listenTo(this.model.users, 'add', this.renderUsers);
            this.listenTo(this.model.users, 'remove', this.renderUsers);

            // Subviews
            this.baselineView = new Chat.baselineView({model: this.model});
            // @todo: create subview for user list and postbox
        },

        render: function() {
            var html = this.template(this.model.toJSON());
            this.$el.html(html);

            // Append subviews
            this.$el.find('.header .name').after(this.baselineView.$el);

            return this;
        },

        renderUsers: function(user) {
            var html = this.userTemplate({
                users: _.sortBy(this.model.users.toJSON(), 'username')
            });
            this.$el.find('.room-users .list-group').html(html);

            return this;
        },

        removeRoom: function(model) {
            if (model === this.model) {
                this.baselineView.remove();
                this.remove();
            }
        },

        close: function (event) {
            this.collection.remove(this.model); // remove model from collection

            // After remove, the room still exists but not in the collection,
            // = .focus() call will choose another room to be focused
            if (this.model.focused) {
                this.collection.focus();
            }

            return false; // stop propagation
        },

        postMessage: function(event) {
            // Enter in field handling
            if (event.type == 'keypress') {
                var key;
                var isShift;
                if (window.event) {
                    key = window.event.keyCode;
                    isShift = window.event.shiftKey ? true : false;
                } else {
                    key = event.which;
                    isShift = event.shiftKey ? true : false;
                }
                if(isShift || event.which != 13) {
                    return;
                }
            }

            // Get the message
            var inputField = this.$el.find('.input-message');
            var message = inputField.val();
            if (message == '') {
                return;
            }

            // Post
            Chat.server.message('ws://chat.local/room#'+this.model.get('room_id'), {message: message});

            // Empty field
            inputField.val('');

            // avoid line break addition in field when submitting with "Enter"
            return false;
        }

    });

    Chat.baselineView = Backbone.View.extend({

        tagName: 'div',
        className: 'baseline-block',

        template: _.template($('#room-baseline-template').html()),

        defaultText: '<em>no baseline</em>',

        events: {
            'click .baseline': 'showForm',
            'click .baseline-cancel': 'hideForm',
            'click .baseline-submit': 'sendNewBaseline',
            'keypress .baseline-input': function(event) {
                if (event.which == 13) {
                    this.sendNewBaseline(event);
                }
            }
        },

        initialize: function() {
            this.listenTo(this.model, 'change:baseline', this.updateBaseline);
            this.render();
        },

        render: function() {
            var html = this.template();
            this.$el.html(html);

            var currentBaseline = this.model.get('baseline');
            if (currentBaseline == '') {
                currentBaseline = this.defaultText;
            }

            this.$el.find('.baseline').html(currentBaseline);
            this.$el.find('.baseline-form').hide();

            return this;
        },

        updateBaseline: function(room, baseline, options) {
            if (baseline == '') {
                baseline = this.defaultText;
            }
            this.$el.find('.baseline').html(baseline);
        },

        showForm: function() {
            this.$el.find('.baseline').hide();
            this.$el.find('.baseline-form').show();
            this.$el.find('.baseline-input').val(this.model.get('baseline')).focus();
        },

        hideForm: function() {
            this.$el.find('.baseline-form').hide();
            this.$el.find('.baseline').show();
        },

        sendNewBaseline: function(event) {
            var newBaseline = this.$el.find('.baseline-input').val();
            Chat.server.baseline('ws://chat.local/room#'+this.model.get('room_id'), newBaseline);
            this.$el.find('.baseline-input').val('')
            this.hideForm();
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
            this.listenTo(Chat.server, 'room:searchSuccess', this.searchSuccess);
            this.listenTo(Chat.server, 'room:searchError', this.searchError);

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

            // Is already opened?
            var room_id = topic.replace('ws://chat.local/room#', '');
            var room = Chat.discussions.get('room'+room_id);
            if (room != undefined) {
                Chat.discussions.focus(room);

            // Room not already open
            } else {
                Chat.server.subscribe(topic);
            }

            this.hide();
        }

    });

});