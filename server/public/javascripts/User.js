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
                avatar: ''
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

        el: $('#block-users'),

        template: _.template($('#online-users-template').html()),

        userSubviews: '',

        initialize: function(options) {
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

    Chat.UserListView = Backbone.View.extend({

        tagName: 'div',

        template: _.template($('#user-template').html()),

        events: {
            'click .user-profile':      'openProfile',
            'click .user-discussion':   'openOneToOne',
            'dblclick a.user-item':     'openOneToOne',
            'click a.user-item':     'stopPropagation'
        },

        initialize: function(options) {
            this.render();
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        openProfile: function(event) {
            Chat.main.userProfileModal(this.model.get('id'));
        },

        openOneToOne: function(event) {
            var onetoone = Chat.discussions.addOneToOne(this.model);
            Chat.discussions.focus(onetoone);

            return false; // stop propagation
        },

        stopPropagation: function(event) {
            // correct bug due to the a.href=#
            return false;
        }

    });

    Chat.UserProfileModal = Backbone.View.extend({

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

    Chat.SearchUserModal = Backbone.View.extend({

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