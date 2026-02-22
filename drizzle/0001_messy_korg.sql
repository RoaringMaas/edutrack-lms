CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`dateTaken` date,
	`type` enum('quiz','exam','project','activity','other') NOT NULL DEFAULT 'quiz',
	`maxScore` int NOT NULL DEFAULT 100,
	`description` text,
	`filePath` text,
	`fileUrl` text,
	`fileName` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`dueDate` date,
	`weekNumber` int,
	`weekLabel` varchar(32),
	`points` int DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`subjectName` varchar(128) NOT NULL,
	`gradeLevel` varchar(32) NOT NULL,
	`section` varchar(32) NOT NULL,
	`academicYear` varchar(16) NOT NULL,
	`term` varchar(32) NOT NULL,
	`alertThreshold` int NOT NULL DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`score` float,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`studentId` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`assignmentId` int NOT NULL,
	`status` enum('submitted','late','missing','pending') NOT NULL DEFAULT 'pending',
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacherNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacherNotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacherNotes_classId_unique` UNIQUE(`classId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `eduRole` enum('teacher','admin') DEFAULT 'teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarInitials` varchar(4);