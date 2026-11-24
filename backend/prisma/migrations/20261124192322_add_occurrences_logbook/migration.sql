-- CreateTable
CREATE TABLE `occurrences` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('SHIFT_HANDOFF', 'MAINTENANCE', 'INCIDENT', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorId` VARCHAR(191) NOT NULL,
    `resolvedById` VARCHAR(191) NULL,

    INDEX `occurrences_isResolved_createdAt_idx`(`isResolved`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `occurrences` ADD CONSTRAINT `occurrences_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `occurrences` ADD CONSTRAINT `occurrences_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
