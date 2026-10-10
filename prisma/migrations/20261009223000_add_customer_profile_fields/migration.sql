-- Add optional customer profile and delivery details.
ALTER TABLE "User"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT;
