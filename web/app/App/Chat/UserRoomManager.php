<?php

namespace App\Chat;

use App\Orm\EntityManager;

class UserRoomManager extends EntityManager
{
    /** @var string */
    protected $table = 'user_room';

    /** @var string */
    protected $entityClass = "\\App\\Chat\\UserRoom";

} 