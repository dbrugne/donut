$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  MODELS  ======================= */
    /* ====================================================== */

    Chat.Room = Chat.Discussion.extend({

        defaults: function() {
            return {
                name: '',
                topic: '',
                type: 'room',
                focused: false,
                unread: 0
            };
        },

        _initialize: function() {
            this.users = new Chat.UsersCollection();
            this.on('remove', this.leave);
            this.listenTo(Chat.server, 'room:in', this.onIn);
            this.listenTo(Chat.server, 'room:out', this.onOut);
            this.listenTo(Chat.server, 'room:topic', this.onTopic);
        },

        leave: function(model, collection, options) {
            Chat.server.leave(model.get('name'));
        },

        onIn: function(data) {
            console.log('user in');
            console.log(data);
            if (data.name != this.get('name')) {
                return;
            }
            var user = new Chat.User({
                id: data.username,
                username: data.username,
                avatar: data.avatar
            });
            this.users.add(user);
            this.trigger('notification', {
                type: 'in',
                user_id: user.get('id'),
                username: user.get('username')
            });
        },

        onOut: function(data) {
            if (data.name != this.get('name')) {
                return;
            }
            var user = this.users.get(data.name);
            this.users.remove(user);
            this.trigger('notification', {
                type: 'out',
                user_id: user.get('id'),
                username: user.get('username')
            });
        },

        onTopic: function(data) {
            if (data.name != this.get('name')) {
                return;
            }
            this.set('topic', data.topic);
            this.trigger('notification', {
                type: 'topic',
                user_id: data.user_id,
                username: data.username,
                topic: data.topic
            });
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
            this.TopicView = new Chat.RoomTopicView({el: this.$el.find('.header > .topic-block'), model: this.model});
            this.usersView = new Chat.RoomUsersView({el: this.$el.find('.col-users'), collection: this.model.users});
        },

        _remove: function(model) {
            this.TopicView.remove();
            this.usersView.remove();
        },

        _renderData: function() {
            return this.model.toJSON();
        },

        _render: function() {
        }

    });

    Chat.RoomTopicView = Backbone.View.extend({

        template: _.template($('#room-topic-template').html()),

        defaultText: '<em>no topic</em>',

        events: {
            'click .topic': 'showForm',
            'click .topic-cancel': 'hideForm',
            'click .topic-submit': 'sendNewTopic',
            'keypress .topic-input': function(event) {
                if (event.which == 13) {
                    this.sendNewTopic(event);
                }
            }
        },

        initialize: function() {
            this.listenTo(this.model, 'change:topic', this.updateTopic);
            this.render();
        },

        render: function() {
            this.$el.html(this.template());

            var currentTopic = this.model.get('topic');
            if (currentTopic == '') {
                currentTopic = this.defaultText;
            }

            this.$el.find('.topic').html(currentTopic);
            this.$el.find('.topic-form').hide();

            return this;
        },

        updateTopic: function(room, topic, options) {
            if (topic == '') {
                topic = this.defaultText;
            }
            this.$el.find('.topic').html(topic);
        },

        showForm: function() {
            this.$el.find('.topic').hide();
            this.$el.find('.topic-form').show();
            this.$el.find('.topic-input').val(this.model.get('baseline')).focus();
        },

        hideForm: function() {
            this.$el.find('.topic-form').hide();
            this.$el.find('.topic').show();
        },

        sendNewTopic: function(event) {
            var newTopic = this.$el.find('.topic-input').val();
            Chat.server.topic(this.model.get('name'), newTopic);
            this.$el.find('.topic-input').val('');
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

    Chat.CreateRoomModal = Backbone.View.extend({

        el: $('#room-create-modal'),

        events: {
            'click #room-create-submit': 'submit',
            'keyup #room-create-input': 'valid'
        },

        initialize: function() {
            this.listenTo(Chat.server, 'room:createSuccess', this.createSuccess);
            this.listenTo(Chat.server, 'room:createError', this.createError);

            this.$input = this.$el.find('#room-create-input');
            this.$formGroup = this.$el.find('.form-group');

            this.$el.on('shown.bs.modal', function (e) {
                that.$input.focus();
            })
        },

        show: function() {
            that = this;
            this.$el.modal('show');
        },

        hide: function() {
            this.$el.modal('hide');
        },

        render: function(rooms) {
            return this;
        },

        valid: function(event) {
            if (this.$input.val() == '') {
                this.$formGroup.removeClass('has-error').removeClass('has-success');
            }

            if (!this._valid()) {
                this.$formGroup.addClass('has-error').removeClass('has-success');
            } else {
                this.$formGroup.addClass('has-success').removeClass('has-error');
                this.$el.find('.create-message').fadeOut();
            }
        },

        /**
         * Room name should be:
         * - between 2 and 30 length
         * - accept alphanumeric characters
         * - specials: - _ \ | [ ] { } @ ^ `
         */
        _valid: function() {
            var name = this.$input.val();
            var pattern = /^[-a-z0-9_\\|[\]{}@^`]{2,30}$/i;
            if (pattern.test(name)) {
                return true;
            } else {
                return false;
            }
        },

        submit: function() {
            if (!this._valid()) {
                return false;
            }

            var name = this.$input.val();

            // call RPC + render
            Chat.server.createRoom(name);
        },

        createSuccess: function(data) {
            // Is already opened?
            var room = Chat.discussions.get(data.name);
            if (room != undefined) {
                Chat.discussions.focus(room);

            // Room not already open
            } else {
                Chat.discussions.thisDiscussionShouldBeFocusedOnSuccess = data.name;
                Chat.server.join(data.name);
            }

            this.$formGroup.removeClass('has-error').removeClass('has-success');
            this.$input.val('');
            this.hide();
        },

        createError: function(data) {
            var error = data.uri.error;
            this.$formGroup.addClass('has-error').removeClass('has-success');
            this.$el.find('.create-message').remove();
            var html = '<p class="create-message bg-danger">'+error+'</p>';
            this.$formGroup.before(html);
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
            this.listenTo(Chat.server, 'room:searchsuccess', this.onSuccess);
            this.listenTo(Chat.server, 'room:searcherror', this.onError);
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
            Chat.server.roomSearch(search);
        },

        onSuccess: function(data) {
            this.render(data.rooms);
        },

        onError: function() {
            // @todo : implement error-callback in DOM
            console.error('Error on searchForRooms call');
        },

        openSelected: function(event) {
            var name = $(event.currentTarget).data('name');

            // Is already opened?
            var room = Chat.discussions.get(name);
            if (room != undefined) {
                Chat.discussions.focus(room);
            } else {
                // Room not already open
                Chat.discussions.thisDiscussionShouldBeFocusedOnSuccess = name;
                Chat.server.join(name);
            }

            this.hide();
        }

    });

});