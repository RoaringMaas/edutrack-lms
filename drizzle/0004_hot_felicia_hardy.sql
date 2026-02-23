ALTER TABLE `grades` ADD CONSTRAINT `uq_grade` UNIQUE(`studentId`,`assessmentId`);--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `uq_submission` UNIQUE(`studentId`,`assignmentId`);