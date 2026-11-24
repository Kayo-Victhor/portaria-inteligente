-- CreateTable
CREATE TABLE `units` (
    `id` VARCHAR(191) NOT NULL,
    `block` VARCHAR(20) NOT NULL,
    `number` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_block_number_key`(`block`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'CONCIERGE', 'RESIDENT') NOT NULL DEFAULT 'RESIDENT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `unitId` VARCHAR(191) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visitor_passes` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `visitorName` VARCHAR(120) NOT NULL,
    `visitorDocument` VARCHAR(30) NULL,
    `visitorType` ENUM('GUEST', 'SERVICE_PROVIDER', 'DELIVERY_COURIER') NOT NULL DEFAULT 'GUEST',
    `singleUse` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `validFrom` DATETIME(3) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `visitor_passes_code_key`(`code`),
    INDEX `visitor_passes_code_status_idx`(`code`, `status`),
    INDEX `visitor_passes_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_logs` (
    `id` VARCHAR(191) NOT NULL,
    `direction` ENUM('ENTRY', 'EXIT') NOT NULL,
    `notes` VARCHAR(255) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `passId` VARCHAR(191) NOT NULL,
    `conciergeId` VARCHAR(191) NOT NULL,

    INDEX `access_logs_passId_idx`(`passId`),
    INDEX `access_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `trackingCode` VARCHAR(100) NULL,
    `carrier` VARCHAR(80) NOT NULL,
    `description` VARCHAR(255) NULL,
    `pickupPinHash` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'PICKED_UP') NOT NULL DEFAULT 'PENDING',
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pickedUpAt` DATETIME(3) NULL,
    `pickedUpBy` VARCHAR(120) NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `receivedById` VARCHAR(191) NOT NULL,

    INDEX `deliveries_unitId_status_idx`(`unitId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitor_passes` ADD CONSTRAINT `visitor_passes_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitor_passes` ADD CONSTRAINT `visitor_passes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_passId_fkey` FOREIGN KEY (`passId`) REFERENCES `visitor_passes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_conciergeId_fkey` FOREIGN KEY (`conciergeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
