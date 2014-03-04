<?php

namespace Server\Chat;
use Ratchet\ConnectionInterface;

class Users
{
    /**
     * Silex application
     *
     * @var Application
     */
    protected $_app;

    /**
     * @var array
     */
    protected $_users = array();

    public function __construct(\Silex\Application $app)
    {
        $this->_app = $app;
    }

    /**
     * @param ConnectionInterface $conn
     */
    public function addConn(ConnectionInterface $conn)
    {
        $userId = $conn->User->getId();
        if (!isset($this->_users[$userId])) {
            $this->_users[$userId] = new \SplObjectStorage;
        }

        $this->_users[$userId]->attach($conn);
    }

    /**
     * @param ConnectionInterface $conn
     */
    public function removeConn(ConnectionInterface $conn)
    {
        $userId = $conn->User->getId();
        $this->_users[$userId]->detach($conn);

        if (count($this->_users[$userId]) < 1) {
            unset($this->_users[$userId]);
        }
    }

    /**
     * Broadcast an event on control topic to all $conn of a particular user
     *
     * @param ConnectionInterface $conn
     * @param mixed $event
     */
    public function broadcastToUser(ConnectionInterface $conn, $event)
    {
        foreach ($this->_users[$conn->User->getId()] as $connToBroadcast) {
            if ($conn != $connToBroadcast) {
                $conn->event($this->_app['channels']->getControlTopic(), $event);
            }
        }
    }

    /**
     * Fired on subscription to control topic
     * Push online users $conn
     *
     * @param ConnectionInterface $conn
     */
    public function pushOnlineUsers(ConnectionInterface $conn)
    {
        // @todo: add a limit to push only 'n' first $conn

        // Push online users
        foreach($this->_users as $userId => $userConns) {
            if ($conn->User->getId() != $userId && count($userConns) > 0) {
                $userConns->rewind();
                $userConn = $userConns->current(); // only for user details

                $conn->event($this->_app['channels']->getControlTopic(), array(
                    'action' => 'newOnlineUser',
                    'data' => array(
                        'user_id' => $userConn->User->getId(),
                        'username' => $userConn->User->getUsername(),
                        'avatar' => $userConn->User->getAvatarUrl(20),
                    ),
                ));

            }
        }
    }

} 