-- CreateTable
CREATE TABLE `post_revisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_id` INTEGER NOT NULL,
    `type` ENUM('autosave', 'manual') NOT NULL DEFAULT 'autosave',
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `short_description` VARCHAR(300) NULL,
    `content` LONGTEXT NOT NULL,
    `featured_image_url` VARCHAR(500) NULL,
    `category_id` INTEGER NULL,
    `category_ids` JSON NULL,
    `author_id` INTEGER NULL,
    `tag_names` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `post_revisions_post_id_created_at_idx`(`post_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_revisions` ADD CONSTRAINT `post_revisions_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
