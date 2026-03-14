'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { FormSchema } from '../types';
import { ensureUserEmailById, syncAuthenticatedUser } from '../supabase/queries';

type AuthActionResult = {
  error: { message: string } | null;
  data?: any;
};

const getEmailRedirectTo = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) return undefined;

  try {
    return new URL('/api/auth/callback', siteUrl).toString();
  } catch {
    return undefined;
  }
};

export async function actionLoginUser({
  email,
  password,
}: z.infer<typeof FormSchema>): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (response.error) {
      return { error: { message: response.error.message } };
    }

    if (response.data.user) {
      await syncAuthenticatedUser(response.data.user, email);
      const persistedEmail = await ensureUserEmailById(response.data.user.id, email);
      if (persistedEmail.error) {
        return {
          error: { message: 'Could not persist user email in database.' },
        };
      }
    }

    return { error: null, data: response.data };
  } catch (error) {
    return { error: { message: 'Unexpected error while logging in.' } };
  }
}

export async function actionSignUpUser({
  email,
  password,
}: z.infer<typeof FormSchema>): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    
    console.log('Attempting signup with email:', email);
    
    // Check if user already exists in our database
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (existingUsers?.length) {
      return { error: { message: 'User already exists' } };
    }

    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: {
          email: email, // Explicitly pass email in metadata
        }
      },
    });

    console.log('Supabase signup response:', response);

    if (response.error) {
      console.error('Supabase signup error:', response.error);
      return { error: { message: response.error.message } };
    }

    // Check if user was created successfully
    if (response.data.user) {
      console.log('User created successfully:', response.data.user);
      
      // Use the email from the form since the user object might not have it yet
      const userEmail = response.data.user.email || email;
      
      if (!userEmail) {
        console.error('No email available for user');
        return { error: { message: 'Email is required for signup' } };
      }
      
      // Sync user data immediately with the email from the form
      const syncResult = await syncAuthenticatedUser(response.data.user, userEmail);
      console.log('Sync result:', syncResult);
      
      if (syncResult.error) {
        console.error('Failed to sync user:', syncResult.error);
        return {
          error: { message: 'Could not sync user data in database.' },
        };
      }
      
      // Ensure email is persisted
      const persistResult = await ensureUserEmailById(response.data.user.id, userEmail);
      console.log('Persist result:', persistResult);
      
      if (persistResult.error) {
        console.error('Failed to persist user email:', persistResult.error);
        return {
          error: { message: 'Could not persist user email in database.' },
        };
      }
    } else {
      console.error('No user data returned from signup');
      return { error: { message: 'Failed to create user account' } };
    }

    return { error: null, data: response.data };
  } catch (error) {
    console.error('Signup error:', error);
    return { error: { message: 'Unexpected error while creating account.' } };
  }
}
