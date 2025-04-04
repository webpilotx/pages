PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts_table` (
	`login` text PRIMARY KEY NOT NULL,
	`accessToken` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
INSERT INTO `__new_accounts_table`("login", "accessToken", "createdAt", "updatedAt") SELECT "login", "accessToken", "createdAt", "updatedAt" FROM `accounts_table`;--> statement-breakpoint
DROP TABLE `accounts_table`;--> statement-breakpoint
ALTER TABLE `__new_accounts_table` RENAME TO `accounts_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;