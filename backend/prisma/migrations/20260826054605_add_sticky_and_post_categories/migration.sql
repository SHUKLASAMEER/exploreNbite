-- AlterTable
ALTER TABLE `posts` ADD COLUMN `sticky` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `post_categories` (
    `post_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    INDEX `post_categories_category_id_idx`(`category_id`),
    PRIMARY KEY (`post_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_categories` ADD CONSTRAINT `post_categories_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_categories` ADD CONSTRAINT `post_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
