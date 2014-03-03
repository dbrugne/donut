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

} 