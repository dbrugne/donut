<?php

namespace Server\Components;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\WebSocket\WsServerInterface;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use App\User\User;

class Authentication implements MessageComponentInterface, WsServerInterface
{
    /**
     * @var \Ratchet\MessageComponentInterface
     */
    protected $_app;

    /**
     * PDO connection to database
     * @var PDO
     */
    protected $_pdo;

    /**
     * Constant
     */
    const SECURITY_COOKIE_NAME = '_security_secured_area'; // @todo: generate dynamically or store in configuration

    /**
     * @param \Ratchet\MessageComponentInterface          $app
     * @param \PDO                                        $pdo
     * @throws \RuntimeException
     */
    public function __construct(MessageComponentInterface $app, \PDO $pdo) {
        $this->_app     = $app;
        $this->_pdo     = $pdo;
    }

    /**
     * Check that user has valid Symfony session, get user and store id and username in
     * $conn->User
     *
     * {@inheritdoc}
     */
    function onOpen(ConnectionInterface $conn)
    {
        if (!isset($conn->Session) || !($conn->Session instanceOf Session)) {
            $conn->close(10001);
        }
        if (false === $tokenDataRaw = $conn->Session->get(self::SECURITY_COOKIE_NAME, false)) {
            $conn->close(10002);
        }
        if (false === $token = unserialize($tokenDataRaw)) {
            $conn->close(10003);
        }
        if (!($token instanceOf UsernamePasswordToken)) {
            $conn->close(10004);
        }
        if (!$token->isAuthenticated()) {
            $conn->close(10005);
        }
        /** @var \App\User\User $user */
        $user = $token->getUser();
        if (!($user instanceOf User) || !$user->getId()) {
            $conn->close(10006);
        }

        $conn->User = new \stdClass;
        $conn->User->id = $user->getId();
        $conn->User->username = $user->getUsername();

        return $this->_app->onOpen($conn);
    }

    /**
     * {@inheritdoc}
     */
    function onMessage(ConnectionInterface $from, $msg) {
        return $this->_app->onMessage($from, $msg);
    }

    /**
     * {@inheritdoc}
     */
    function onClose(ConnectionInterface $conn) {
        return $this->_app->onClose($conn);
    }

    /**
     * {@inheritdoc}
     */
    function onError(ConnectionInterface $conn, \Exception $e) {
        return $this->_app->onError($conn, $e);
    }

    /**
     * {@inheritdoc}
     */
    public function getSubProtocols() {
        if ($this->_app instanceof WsServerInterface) {
            return $this->_app->getSubProtocols();
        } else {
            return array();
        }
    }
}