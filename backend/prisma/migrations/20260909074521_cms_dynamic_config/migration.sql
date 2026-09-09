-- AlterTable
ALTER TABLE `awards` ADD COLUMN `badge_slot` ENUM('none', 'award_photo', 'tripoto', 'indiblogger') NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE `pages` ADD COLUMN `page_type` ENUM('standard', 'contact', 'work_with_me') NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `default_og_image_url` VARCHAR(500) NULL,
    ADD COLUMN `hero_image_url` VARCHAR(500) NULL,
    ADD COLUMN `meta_description` VARCHAR(300) NULL,
    ADD COLUMN `tagline` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `sidebar_widget_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `layout` VARCHAR(30) NOT NULL,
    `widget_key` VARCHAR(40) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL,

    INDEX `sidebar_widget_settings_layout_idx`(`layout`),
    UNIQUE INDEX `sidebar_widget_settings_layout_widget_key_key`(`layout`, `widget_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Data backfill — populate the new editorial columns with the values that
-- were previously hardcoded in the frontend, so the public site renders
-- identically after this migration. Existing rows are otherwise untouched.
-- ---------------------------------------------------------------------------

-- Settings singleton: the hero tagline/image + default meta description that
-- lived in frontend/components/public/Header.js and frontend/lib/seo.js.
UPDATE `settings` SET
  `tagline` = COALESCE(`tagline`, 'Travel and explore off-beat destinations'),
  `hero_image_url` = COALESCE(`hero_image_url`, '/hero-bhadkeshwar-mahadev.jpg'),
  `meta_description` = COALESCE(`meta_description`, 'Offbeat travel stories and food, one bite at a time — by Sweta Papaiyawala.')
WHERE `id` = 1;

-- Page types: previously detected by matching slug/title. Applied here ONCE
-- as a data migration; from now on the explicit column is the source of truth.
UPDATE `pages` SET `page_type` = 'contact'
  WHERE `page_type` = 'standard'
    AND (`slug` IN ('contact', 'contact-us', 'contct') OR LOWER(TRIM(`title`)) IN ('contact', 'contact us'));
UPDATE `pages` SET `page_type` = 'work_with_me'
  WHERE `page_type` = 'standard'
    AND (`slug` IN ('work-with-me', 'work-with-me-2', 'collaborate', 'hire-me')
         OR LOWER(TRIM(`title`)) IN ('work with me', 'collaborate'));

-- Award badge slots: previously the sidebar matched these by regex on the
-- award title / sourceLink (see the old findAward() in Sidebar.js). Same
-- signals, applied once here.
UPDATE `awards` SET `badge_slot` = 'award_photo'
  WHERE `badge_slot` = 'none' AND LOWER(`title`) LIKE '%travel and food writer%';
UPDATE `awards` SET `badge_slot` = 'tripoto'
  WHERE `badge_slot` = 'none' AND `source_link` LIKE '%tripoto.com%';
UPDATE `awards` SET `badge_slot` = 'indiblogger'
  WHERE `badge_slot` = 'none' AND `source_link` LIKE '%indiblogger%';

-- Sidebar widget composition: 1:1 with the LAYOUTS map that was hardcoded in
-- frontend/components/public/Sidebar.js (verified against the live site).
INSERT INTO `sidebar_widget_settings` (`layout`, `widget_key`, `enabled`, `sort_order`) VALUES
  ('home', 'search', true, 0),
  ('home', 'recommended', true, 1),
  ('home', 'facebook', true, 2),
  ('home', 'subscribe', true, 3),
  ('home', 'twitter', true, 4),
  ('home', 'award', true, 5),
  ('home', 'tripoto', true, 6),
  ('home', 'indiblogger', true, 7),
  ('home', 'surly', true, 8),
  ('archive', 'recentPosts', true, 0),
  ('archive', 'search', true, 1),
  ('archive', 'recommended', true, 2),
  ('archive', 'facebook', true, 3),
  ('archive', 'subscribe', true, 4),
  ('archive', 'twitter', true, 5),
  ('archive', 'award', true, 6),
  ('archive', 'tripoto', true, 7),
  ('archive', 'indiblogger', true, 8),
  ('archive', 'surly', true, 9),
  ('post', 'recentPosts', true, 0),
  ('post', 'search', true, 1),
  ('page', 'recommended', true, 0),
  ('page', 'recentPosts', true, 1),
  ('contact', 'search', true, 0),
  ('contact', 'recommended', true, 1),
  ('contact', 'recentPosts', true, 2),
  ('utility', 'search', true, 0),
  ('utility', 'recommended', true, 1),
  ('utility', 'recentPosts', true, 2);
