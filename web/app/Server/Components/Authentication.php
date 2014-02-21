<?php

namespace Server\Components;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\WebSocket\WsServerInterface;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authentication\Token\RememberMeToken;
use App\User\UserManager;
use App\User\User;

class Authentication implements MessageComponentInterface, WsServerInterface
{
    /**
     * @var \Ratchet\MessageComponentInterface
     */
    protected $_app;

    /**
     * Silex App
     * @var \Silex\Application
     */
    protected $_silexApp;

    /**
     * UserManager instance
     * @var UserManager
     */
    protected $_userManager;

    /**
     * Constant
     */
    const SECURITY_COOKIE_NAME = '_security_secured_area'; // @todo: generate dynamically or store in configuration

    /**
     * @param \Ratchet\MessageComponentInterface          $app
     * \Silex\Application                                 $silexApp
     * @throws \RuntimeException
     */
    public function __construct(MessageComponentInterface $app, \Silex\Application $silexApp) {
        $this->_app     = $app;
        $this->_silexApp = $silexApp;
        $this->_userManager = new UserManager($this->_silexApp['db'], $this->_silexApp);
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
        if (!($token instanceOf UsernamePasswordToken)
                && !($token instanceOf RememberMeToken)) {
            $conn->close(10004);
        }
        if (!$token->isAuthenticated()) {
            $conn->close(10005);
        }
        /** @var \App\User\User $user */
        $sessionUser = $token->getUser();
        if (!($sessionUser instanceOf User) || !$sessionUser->getId()) {
            $conn->close(10006);
        }

        if (null == $user = $this->_userManager->findOneBy(array('id' => $sessionUser->getId()))) {
            $conn->close(10007);
        }

        $conn->User = $user;

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