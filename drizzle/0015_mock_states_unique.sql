DROP INDEX IF EXISTS `mock_states_project_collection_key_idx`;--> statement-breakpoint
-- Collapse any duplicate state rows created by the old select-then-insert
-- path before enforcing uniqueness. Keep the most recently inserted row.
DELETE FROM `mock_states`
WHERE `rowid` NOT IN (
	SELECT MAX(`rowid`)
	FROM `mock_states`
	GROUP BY `project_id`, `collection`, `item_key`
);--> statement-breakpoint
CREATE UNIQUE INDEX `mock_states_project_collection_key_idx` ON `mock_states` (`project_id`,`collection`,`item_key`);
