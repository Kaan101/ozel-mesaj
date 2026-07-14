-- CreateEnum
CREATE TYPE "AdminTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AdminTaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "admin_tasks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AdminTaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "AdminTaskPriority" NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_tasks_pkey" PRIMARY KEY ("id")
);
