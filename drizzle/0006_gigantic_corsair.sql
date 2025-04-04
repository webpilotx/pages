CREATE TABLE `deployments_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pageId` integer NOT NULL,
	`output` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`pageId`) REFERENCES `pages_table`(`id`) ON UPDATE no action ON DELETE cascade
);
