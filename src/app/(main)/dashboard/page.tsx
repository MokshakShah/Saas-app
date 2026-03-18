import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSetup from '@/components/dashboard-setup/dashboard-setup';
import {
  getCollaboratingWorkspaces,
  getPrivateWorkspaces,
  getSharedWorkspaces,
  getUserSubscriptionStatus,
} from '@/lib/supabase/queries';

const DashboardPage = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: subscription, error: subscriptionError } =
    await getUserSubscriptionStatus(user.id);

  if (subscriptionError) return;

  const [privateWorkspaces, collaboratingWorkspaces, sharedWorkspaces] =
    await Promise.all([
      getPrivateWorkspaces(user.id),
      getCollaboratingWorkspaces(user.id),
      getSharedWorkspaces(user.id),
    ]);

  const workspace =
    privateWorkspaces[0] ||
    collaboratingWorkspaces[0] ||
    sharedWorkspaces[0] ||
    null;

  if (!workspace)
    return (
      <div
        className="bg-background
        h-screen
        w-screen
        flex
        justify-center
        items-center
  "
      >
        <DashboardSetup
          user={user}
          subscription={subscription}
        />
      </div>
    );

  redirect(`/dashboard/${workspace.id}`);
};

export default DashboardPage;
