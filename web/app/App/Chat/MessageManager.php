<?php

namespace App\Chat;

use App\Orm\EntityManager;

class MessageManager extends EntityManager
{
    /** @var string */
    protected $table = 'messages';

    /** @var string */
    protected $entityClass = "\\App\\Chat\\Message";

} 