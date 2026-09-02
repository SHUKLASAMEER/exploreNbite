-- CreateTable
CREATE TABLE `contact_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topic` ENUM('contact', 'work_with_me') NOT NULL DEFAULT 'contact',
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `subject` VARCHAR(200) NULL,
    `message` TEXT NOT NULL,
    `handled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_messages_handled_created_at_idx`(`handled`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
