import React from 'react';
import { Subscription } from '@/lib/supabase/supabase.types';
import { createClient } from '@/lib/supabase/server';
import db from '@/lib/supabase/db';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import CypressProfileIcon from '../icons/cypressProfileIcon';
import ModeToggle from '../global/mode-toggle';
import { LogOut } from 'lucide-react';
import LogoutButton from '../global/logout-button';

interface UserCardProps {
  subscription: Subscription | null;
}

const UserCard: React.FC<UserCardProps> = async ({ subscription }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  
  let profile;
  try {
    const response = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, user.id),
    });
    
    if (!response) {
      // If user not found in database, create a basic profile from auth user
      profile = {
        id: user.id,
        email: user.email || 'No email',
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      };
    } else {
      let avatarPath = '';
      if (response.avatarUrl) {
        avatarPath = supabase.storage
          .from('avatars')
          .getPublicUrl(response.avatarUrl)?.data.publicUrl;
      }
      profile = {
        ...response,
        avatarUrl: avatarPath,
      };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Fallback to auth user data
    profile = {
      id: user.id,
      email: user.email || 'No email',
      fullName: user.user_metadata?.full_name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  }

  return (
    <article
      className="flex 
      justify-between 
      items-center 
      px-4 
      py-2 
      dark:bg-Neutrals/neutrals-12
      bg-gray-50
      rounded-3xl
      mt-4
  "
    >
      <aside className="flex justify-center items-center gap-2">
        <Avatar>
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback>
            <CypressProfileIcon />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">
            {subscription?.status === 'active' ? 'Pro Plan' : 'Free Plan'}
          </span>
          <small
            className="w-[100px] 
          overflow-hidden 
          overflow-ellipsis
          text-xs
          "
          >
            {profile.email}
          </small>
        </div>
      </aside>
      <div className="flex items-center justify-center gap-1">
        <LogoutButton>
          <LogOut size={16} />
        </LogoutButton>
        <ModeToggle />
      </div>
    </article>
  );
};

export default UserCard;
