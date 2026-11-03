CREATE TABLE IF NOT EXISTS `cli_auth_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code_hash` text NOT NULL,
	`user_code` text NOT NULL,
	`device_name` text DEFAULT 'Terminal' NOT NULL,
	`platform` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	`consumed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cli_auth_requests_device_code_hash_unique` ON `cli_auth_requests` (`device_code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cli_auth_requests_user_code_unique` ON `cli_auth_requests` (`user_code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cli_auth_requests_status_idx` ON `cli_auth_requests` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cli_auth_requests_expires_at_idx` ON `cli_auth_requests` (`expires_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cli_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`platform` text DEFAULT 'unknown' NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cli_devices_token_hash_unique` ON `cli_devices` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cli_devices_user_id_idx` ON `cli_devices` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`project_limit` integer DEFAULT 3 NOT NULL,
	`route_limit` integer DEFAULT 50 NOT NULL,
	`request_log_retention_days` integer DEFAULT 7 NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `workspace_meta_user_id_unique` ON `workspace_meta` (`user_id`);
