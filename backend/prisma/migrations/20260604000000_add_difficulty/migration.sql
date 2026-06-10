-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable: add difficulty column
ALTER TABLE "Question" ADD COLUMN "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable: remove email verification and password reset columns (if they exist)
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailOtpHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailOtpExpiresAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetTokenHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetExpiresAt";
