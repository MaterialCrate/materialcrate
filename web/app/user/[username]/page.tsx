import ProfilePage from "@/app/components/profile/ProfilePage";

type UserProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;

  return <ProfilePage username={username} />;
}
