CREATE TABLE `envs_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pageId` integer NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`pageId`) REFERENCES `pages_table`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo` text NOT NULL,
	`name` text NOT NULL,
	`branch` text NOT NULL,
	`buildScript` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text
);
