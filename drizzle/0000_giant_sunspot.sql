CREATE TABLE `study_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`unit` text NOT NULL,
	`total` real NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`daily_amount` real NOT NULL,
	`start_date` text NOT NULL,
	`due_date` text NOT NULL,
	`unavailable_dates` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
