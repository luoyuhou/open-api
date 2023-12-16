CREATE TABLE user (
    id int unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) NOT NULL,
    status tinyint(4) NOT NULL,
    first_name varchar(32) NOT NULL,
    last_name varchar(32) NOT NULL,
    email varchar(64),
    phone varchar(11) NOT NULL,
    avatar varchar(256),
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`user_id`),
    UNIQUE KEY (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE user_signIn_password (
    id int unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) NOT NULL,
    salt varchar(16) NOT NULL,
    password varchar(64) NOT NULL,
    failed_login_times tinyint(2) unsigned NOT NULL default 0,
    locked_date datetime,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE user_signIn_history(
    id int unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) NOT NULL,
    ip varchar(64),
    useragent varchar(256),
    source tinyint(4) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `user_signIn_history_userId_idx`(`user_id`),
    INDEX `user_signIn_history_createDate_idx`(`create_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;