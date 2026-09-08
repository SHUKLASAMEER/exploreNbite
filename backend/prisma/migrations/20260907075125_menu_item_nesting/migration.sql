-- AlterTable
ALTER TABLE `menu_items` ADD COLUMN `parent_id` INTEGER NULL,
    MODIFY `link_type` ENUM('page', 'category', 'custom_url', 'group') NOT NULL;

-- CreateIndex
CREATE INDEX `menu_items_parent_id_idx` ON `menu_items`(`parent_id`);

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
