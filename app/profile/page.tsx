import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ProfileForm, { type ProfileData } from "./ProfileForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) redirect("/login?next=%2Fprofile");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) redirect("/login");

  const profile: ProfileData = {
    ...user,
    role: user.role as "CUSTOMER" | "ADMIN",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  return <ProfileForm initialProfile={profile} />;
}
