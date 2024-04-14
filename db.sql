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

ALTER TABLE user MODIFY phone varchar(16) NOT NULL;


CREATE TABLE user_signin_password (
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

ALTER TABLE user_signIn_password MODIFY salt varchar(32) NOT NULL;


CREATE TABLE user_signin_history(
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

CREATE TABLE user_address (
    id int unsigned NOT NULL AUTO_INCREMENT,
    user_address_id varchar(64) NOT NULL,
    user_id varchar(64) NOT NULL,
    recipient varchar(64) NOT NULL,
    phone varchar(16) NOT NULL,
    province varchar(8) NOT NULL,
    city varchar(8) NOT NULL,
    district varchar(16) NOT NULL,
    address varchar(128) NOT NULL,
    is_default tinyint(1) NOT NULL DEFAULT 0,
    tag varchar(8),
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`user_address_id`),
    INDEX `user_address_user_idx` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE user_address ADD COLUMN status tinyint(1) NOT NULL DEFAULT 1 after tag;
ALTER TABLE user_address CHANGE COLUMN district area varchar(8) NOT NULL;
ALTER TABLE user_address ADD COLUMN town varchar(8) NOT NULL after area;

CREATE TABLE store_apply (
    id int unsigned NOT NULL AUTO_INCREMENT,
    store_id varchar(64) NOT NULL,
    type tinyint(4) unsigned NOT NULL,
    applicant_user_id varchar(64) NOT NULL,
    applicant_date datetime NOT NULL,
    applicant_summary varchar(128) NOT NULL,
    applicant_content varchar(1024) NOT NULL,
    status tinyint(2) NOT NULL default 0,
    replient_user_id varchar(64),
    replient_date datetime,
    replient_content varchar(256),
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `store_apply_idx` (`store_id`) USING BTREE,
    INDEX `store_apply_type_idx` (`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE store (
    id int unsigned NOT NULL AUTO_INCREMENT,
    store_id varchar(64) NOT NULL,
    id_code varchar(32) NOT NULL,
    id_name varchar(32) NOT NULL,
    user_id varchar(64) NOT NULL,
    store_name varchar(64) NOT NULL,
    phone varchar(11) NOT NULL,
    province varchar(8) NOT NULL,
    city varchar(8) NOT NULL,
    district varchar(16) NOT NULL,
    address varchar(128) NOT NULL,
    status tinyint(4) NOT NULL DEFAULT 0,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`store_id`),
    INDEX `store_name_idx` (`store_name`) USING BTREE,
    INDEX `store_user_idx` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE store CHANGE COLUMN district area varchar(8) NOT NULL;
ALTER TABLE store ADD COLUMN town varchar(8) NOT NULL after area;

CREATE TABLE store_history (
    id int unsigned NOT NULL AUTO_INCREMENT,
    store_id varchar(64) NOT NULL,
    action_type tinyint(4) unsigned NOT NULL,
    action_content varchar(256) NOT NULL,
    applicant_user_id varchar(64) NOT NULL,
    applicant_date date NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `store_history_idx` (`store_id`) USING BTREE,
    INDEX `store_action_type_idx` (`action_type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE store_history MODIFY applicant_date datetime NOT NULL;
ALTER TABLE store_history ADD COLUMN payload varchar(1024) after action_content;
ALTER TABLE store_history CHANGE COLUMN applicant_user_id action_user_id varchar(64) NOT NULL;
ALTER TABLE store_history CHANGE COLUMN applicant_date action_date datetime NOT NULL;

CREATE TABLE category_goods (
    id int unsigned NOT NULL AUTO_INCREMENT,
    category_id varchar(64) NOT NULL,
    store_id varchar(64) NOT NULL,
    pid varchar(64),
    name varchar(16) NOT NULL,
    status tinyint(4) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`category_id`),
    UNIQUE KEY (`store_id`, `name`) USING BTREE,
    INDEX `category_goods_name` (`name`) USING BTREE,
    INDEX `category_goods_idx` (`store_id`, `pid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE category_goods ADD COLUMN `rank` tinyint(5) NOT NULL DEFAULT 0 after pid;


CREATE TABLE store_goods (
    id int unsigned NOT NULL AUTO_INCREMENT,
    goods_id varchar(64) NOT NULL,
    store_id varchar(64) NOT NULL,
    category_id varchar(64) NOT NULL,
    name varchar(16) NOT NULL,
    description varchar(256),
    status tinyint(4) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`goods_id`),
    INDEX `store_idx` (`store_id`) USING BTREE,
    INDEX `goods_name_idx` (`name`) USING BTREE,
    UNIQUE KEY (`store_id`, `category_id`, `name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE store_goods_version (
    id int unsigned NOT NULL AUTO_INCREMENT,
    version_id varchar(64) NOT NULL,
    goods_id varchar(64) NOT NULL,
    version_number varchar(32),
    bar_code varchar(32),
    count int unsigned NOT NULL,
    price int unsigned NOT NULL,
    unit_name varchar(8) NOT NULL,
    supplier varchar(64),
    status tinyint(4) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`version_id`),
    UNIQUE KEY (`goods_id`, `unit_name`, `version_number`),
    UNIQUE KEY (`goods_id`, `unit_name`, `bar_code`),
    INDEX `goods_idx` (`goods_id`) USING BTREE,
    INDEX `goods_suppler_idx` (`supplier`) USING BTREE,
    INDEX `goods_version_number_idx` (`version_number`) USING BTREE,
    INDEX `goods_bar_code_idx` (`bar_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_order (
    id int unsigned NOT NULL AUTO_INCREMENT,
    order_id varchar(64) NOT NULL,
    user_id varchar(64) NOT NULL,
    store_id varchar(64) NOT NULL,
    status tinyint(4) NOT NULL,
    recipient varchar(16) NOT NULL,
    money int unsigned NOT NULL,
    phone varchar(16) NOT NULL,
    province varchar(8) NOT NULL,
    city varchar(8) NOT NULL,
    district varchar(16) NOT NULL,
    address varchar(128) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`order_id`),
    INDEX `user_order_user_idx` (`user_id`) USING BTREE,
    INDEX `user_order_store_idx` (`store_id`) USING BTREE,
    INDEX `user_order_idx` (`user_id`, `store_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE user_order ADD Column delivery_date datetime NOT NULL after address;
ALTER TABLE user_order CHANGE COLUMN district area varchar(8) NOT NULL;
ALTER TABLE user_order ADD COLUMN town varchar(8) NOT NULL after area;
ALTER TABLE user_order ADD stage tinyint(4) NOT NULL after status;

CREATE TABLE user_order_info (
    id int unsigned NOT NULL AUTO_INCREMENT,
    order_info_id varchar(64) NOT NULL,
    order_id varchar(64) NOT NULL,
    goods_id varchar(64) NOT NULL,
    goods_name varchar(16) NOT NULL,
    goods_version_id varchar(64) NOT NULL,
    count int unsigned NOT NULL,
    price int unsigned NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`order_info_id`),
    INDEX `order_Info_order_idx` (`order_id`) USING BTREE,
    INDEX `order_info_goods_idx` (`goods_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_order_action (
    id int unsigned NOT NULL AUTO_INCREMENT,
    order_action_id varchar(64) NOT NULL,
    user_id varchar(64) NOT NULL,
    order_id varchar(64) NOT NULL,
    status tinyint(4) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`order_action_id`),
    INDEX `order_idx` (`order_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `province` (
    id int unsigned NOT NULL AUTO_INCREMENT,
    code bigint(8) NOT NULL,
    name varchar(32) NOT NULL,
    province varchar(8) NOT NULL,
    city varchar(8) NOT NULL,
    area varchar(8) NOT NULL,
    town varchar(8) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `code_idx` (`code`) USING BTREE,
    INDEX `city_idx` (`city`) USING BTREE,
    INDEX `province_idx` (`province`, `city`, `area`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE province MODIFY COLUMN code varchar(8) NOT NULL;

CREATE TABLE `user_signin_wechat` (
    id int unsigned NOT NULL AUTO_INCREMENT,
    openid varchar(64) NOT NULL,
    user_id varchar(64) NOT NULL,
    create_date datetime DEFAULT CURRENT_TIMESTAMP,
    update_date datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY (`openid`),
    UNIQUE KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `auth` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pid` varchar(64) NOT NULL DEFAULT '0',
  `auth_id` varchar(64) NOT NULL,
  `side` tinyint(4) unsigned NOT NULL,
  `path` varchar(64) NOT NULL,
  `method` varchar(8),
  `status` tinyint(2) NOT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_id` (`auth_id`),
  UNIQUE KEY `auth_idx` (`side`, `path`),
  KEY `auth_side_idx` (`side`),
  KEY `auth_pid_idx` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `user_auth` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(64) NOT NULL,
  `is_admin` tinyint(1) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` varchar(64) NOT NULL,
  `role_name` varchar(16) NOT NULL,
  `description` varchar(1024) DEFAULT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_id` (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `auth_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `auth_id` varchar(64) NOT NULL,
  `role_id` varchar(64) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_id` (`role_id`,`auth_id`) USING BTREE,
  KEY `auth_idx` (`auth_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `user_role` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `status` tinyint(2) NOT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`role_id`) USING BTREE,
  KEY `role_idx` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `user_fetch` (
	`id` int(10) unsigned NOT NULL AUTO_INCREMENT,
	`user_id` varchar(64) NOT NULL,
	`url` varchar(256) NOT NULL,
	`method` varchar(8) NOT NULL,
	`create_date` datetime default CURRENT_TIMESTAMP,
	`update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	INDEX `fetch_user_idx` (`user_id`) USING BTREE,
	INDEX `fetch_url_idx` (`url`,`method`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE user_fetch ADD COLUMN `source` tinyint(4) unsigned NOT NULL after `user_id`;

CREATE TABLE `report_daily_user_fetch` (
    `id` int (10) unsigned NOT NULL AUTO_INCREMENT,
    `user_id` varchar(64) NOT NULL,
    `times` smallint unsigned NOT NULL,
    `use_time` mediumint unsigned NOT NULL,
    `record_date` datetime NOT NULL,
    `create_date` datetime default CURRENT_TIMESTAMP,
    `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `fetch_daily_user_idx` (`user_id`) USING BTREE,
    INDEX `fetch_daily_record_date_idx` (`record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
