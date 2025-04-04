PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pages_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo` text NOT NULL,
	`name` text NOT NULL,
	`branch` text NOT NULL,
	`buildScript` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
INSERT INTO `__new_pages_table`("id", "repo", "name", "branch", "buildScript", "createdAt", "updatedAt") SELECT "id", "repo", "name", "branch", "buildScript", "createdAt", "updatedAt" FROM `pages_table`;--> statement-breakpoint
DROP TABLE `pages_table`;--> statement-breakpoint
ALTER TABLE `__new_pages_table` RENAME TO `pages_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;