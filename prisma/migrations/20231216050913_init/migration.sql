-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(64) NOT NULL,
    `status` TINYINT NOT NULL,
    `first_name` VARCHAR(32) NOT NULL,
    `last_name` VARCHAR(32) NOT NULL,
    `email` VARCHAR(64) NULL,
    `phone` VARCHAR(11) NOT NULL,
    `avatar` VARCHAR(256) NULL,
    `create_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_id`(`user_id`),
    UNIQUE INDEX `phone`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_signin_history` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(64) NOT NULL,
    `ip` VARCHAR(64) NULL,
    `useragent` VARCHAR(256) NULL,
    `source` TINYINT NOT NULL,
    `create_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_signIn_history_createDate_idx`(`create_date`),
    INDEX `user_signIn_history_userId_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_signin_password` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(64) NOT NULL,
    `salt` VARCHAR(16) NOT NULL,
    `password` VARCHAR(64) NOT NULL,
    `failed_login_times` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `locked_date` DATETIME(0) NULL,
    `create_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_date` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
