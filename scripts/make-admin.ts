import "dotenv/config";
import { db } from "../lib/db";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error(
      "Usage: npx tsx scripts/make-admin.ts your@email.com"
    );
    process.exit(1);
  }

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    console.error(
      `No user found with email: ${email}`
    );
    process.exit(1);
  }

  const updatedUser = await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: "ADMIN",
    },
  });

  console.log(
    `✅ ${updatedUser.email} is now an ADMIN.`
  );
}

main()
  .catch((error) => {
    console.error("Failed to make admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });