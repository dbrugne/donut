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

        _initialize: function() {
            this.baselineView = new Chat.RoomBaselineView({el: this.$el.find('.header > .baseline-block'), model: this.model});
            this.usersView = new Chat.RoomUsersView({el: this.$el.find('.col-users'), collection: this.model.users});
        },

        _remove: function(model) {
            this.baselineView.remove();
            this.usersView.remove();
        },

        _renderData: function() {
            return this.model.toJSON();
        },

        _render: function() {
        }

    });

    Chat.RoomBaselineView = Backbone.View.extend({

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
            this.$el.html(this.template());

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
            this.$el.find('.baseline-input').val('');
            this.hideForm();
        }
    });

    Chat.RoomUsersView = Backbone.View.extend({

        template: _.template($('#room-users-template').html()),

        userSubviews: '',

        initialize: function() {
            this.listenTo(this.collection, 'add', this.addUser);
            this.listenTo(this.collection, 'remove', this.removeUser);

            this.render();

            this.userSubviews = new Backbone.Collection();
            this.$list = this.$el.find('.list-group');
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        remove: function() {
            this.userSubviews.each(function(item) {
                item.get('view').remove();
            });
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        addUser: function(model, collection, options) {
            var view = new Chat.UserListView({model: model});
            this.userSubviews.add({
                id: model.get('id'),
                username: model.get('username'),
                view: view
            });
            this.$list.append(view.$el);

            this.sort();
        },

        removeUser: function(model, collection, options) {
            var view = this.userSubviews.get(model.get('id')).get('view').remove();
            this.userSubviews.remove(model.get('id'));
        },

        sort: function() {
            var sorted = _.sortBy(this.userSubviews.toJSON(), 'username');
            this.$list.empty();

            _.each(sorted, function(item) {
                this.$list.append(item.view.$el);
                item.view.delegateEvents();
            }, this);
        }

    });

    Chat.SearchRoomModal = Backbone.View.extend({

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