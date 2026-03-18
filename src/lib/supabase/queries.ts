'use server';
import { validate } from 'uuid';
import { files, folders, users, workspaces } from '../../../migrations/schema';
import db from './db';
import { File, Folder, Subscription, User, workspace } from './supabase.types';
import { and, eq, ilike, notExists, isNotNull } from 'drizzle-orm';
import { collaborators } from './schema';
import { revalidatePath } from 'next/cache';

export const createWorkspace = async (workspace: workspace) => {
  try {
    const response = await db.insert(workspaces).values(workspace);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const deleteWorkspace = async (workspaceId: string) => {
  if (!workspaceId) return;
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
};

export const getUserSubscriptionStatus = async (userId: string) => {
  try {
    const data = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.userId, userId),
    });
    if (data) return { data: data as Subscription, error: null };
    else return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: `Error` };
  }
};

export const syncAuthenticatedUser = async (authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}, fallbackEmail?: string | null) => {
  if (!authUser?.id) return { data: null, error: 'Missing user id' };

  try {
    const normalizedAuthEmail = authUser.email?.trim() || null;
    const normalizedFallbackEmail = fallbackEmail?.trim() || null;

    // Get existing user from database
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, authUser.id),
    });

    const existingEmail = existingUser?.email?.trim() || null;

    // Priority: fallbackEmail (from form) > authUser.email > existingEmail
    const resolvedEmail = normalizedFallbackEmail ?? normalizedAuthEmail ?? existingEmail;

    console.log('syncAuthenticatedUser:', {
      authUserEmail: normalizedAuthEmail,
      fallbackEmail: normalizedFallbackEmail,
      existingEmail,
      resolvedEmail
    });

    if (!resolvedEmail) {
      return { data: null, error: 'No email available to sync' };
    }

    const fullName =
      typeof authUser.user_metadata?.full_name === 'string'
        ? authUser.user_metadata.full_name
        : null;
    const avatarUrl =
      typeof authUser.user_metadata?.avatar_url === 'string'
        ? authUser.user_metadata.avatar_url
        : null;

    await db
      .insert(users)
      .values({
        id: authUser.id,
        email: resolvedEmail,
        fullName,
        avatarUrl,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: resolvedEmail,
          fullName,
          avatarUrl,
          updatedAt: new Date().toISOString(),
        },
      });

    return { data: null, error: null };
  } catch (error) {
    console.log('syncAuthenticatedUser error:', error);
    return { data: null, error: 'Error syncing user' };
  }
};

export const ensureUserEmailById = async (
  userId: string,
  email?: string | null
) => {
  const normalizedEmail = email?.trim() || '';

  if (!userId) {
    return { data: null, error: 'Missing user id' };
  }

  if (!normalizedEmail) {
    return { data: null, error: 'Missing email' };
  }

  try {
    await db
      .insert(users)
      .values({
        id: userId,
        email: normalizedEmail,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: normalizedEmail,
          updatedAt: new Date().toISOString(),
        },
      });

    return { data: null, error: null };
  } catch (error) {
    console.log('ensureUserEmailById error:', error);
    return { data: null, error: 'Error persisting user email' };
  }
};

export const getFolders = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid)
    return {
      data: null,
      error: 'Error',
    };

  try {
    const results: Folder[] | [] = await db
      .select()
      .from(folders)
      .orderBy(folders.createdAt)
      .where(eq(folders.workspaceId, workspaceId));
    return { data: results, error: null };
  } catch (error) {
    return { data: null, error: 'Error' };
  }
};

export const getWorkspaceDetails = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid)
    return {
      data: [],
      error: 'Error',
    };

  try {
    const response = (await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)) as workspace[];
    return { data: response, error: null };
  } catch (error) {
    console.log(error);
    return { data: [], error: 'Error' };
  }
};

export const getFileDetails = async (fileId: string) => {
  const isValid = validate(fileId);
  if (!isValid) {
    return {
      data: [],
      error: 'Error'
    };
  }
  try {
    const response = (await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1)) as File[];
    return { data: response, error: null };
  } catch (error) {
    console.log('🔴Error', error);
    return { data: [], error: 'Error' };
  }
};

export const deleteFile = async (fileId: string) => {
  if (!fileId) return;
  await db.delete(files).where(eq(files.id, fileId));
};

export const deleteFolder = async (folderId: string) => {
  if (!folderId) return;
  await db.delete(folders).where(eq(folders.id, folderId));
};

export const getFolderDetails = async (folderId: string) => {
  const isValid = validate(folderId);
  if (!isValid) {
    return {
      data: [],
      error: 'Error'
    };
  }

  try {
    const response = (await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))
      .limit(1)) as Folder[];

    return { data: response, error: null };
  } catch (error) {
    return { data: [], error: 'Error' };
  }
};

export const getPrivateWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const privateWorkspaces = (await db
    .select({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(workspaces)
    .where(
      and(
        notExists(
          db
            .select({ workspaceId: collaborators.workspaceId })
            .from(collaborators)
            .where(eq(collaborators.workspaceId, workspaces.id))
        ),
        eq(workspaces.workspaceOwner, userId)
      )
    )) as workspace[];
  return privateWorkspaces;
};

export const getCollaboratingWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const collaboratedWorkspaces = (await db
    .select({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(users)
    .innerJoin(collaborators, eq(users.id, collaborators.userId))
    .innerJoin(workspaces, eq(collaborators.workspaceId, workspaces.id))
    .where(eq(users.id, userId))) as workspace[];
  return collaboratedWorkspaces;
};

export const getSharedWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const sharedWorkspaces = (await db
    .selectDistinct({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(workspaces)
    .orderBy(workspaces.createdAt)
    .innerJoin(collaborators, eq(workspaces.id, collaborators.workspaceId))
    .where(eq(workspaces.workspaceOwner, userId))) as workspace[];
  return sharedWorkspaces;
};

export const getFiles = async (folderId: string) => {
  const isValid = validate(folderId);
  if (!isValid) return { data: null, error: 'Error' };
  try {
    const results = (await db
      .select()
      .from(files)
      .orderBy(files.createdAt)
      .where(eq(files.folderId, folderId))) as File[] | [];
    return { data: results, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const addCollaborators = async (users: User[], workspaceId: string) => {
  try {
    for (const user of users) {
      const userExists = await db
        .select({ userId: collaborators.userId })
        .from(collaborators)
        .where(
          and(
            eq(collaborators.userId, user.id),
            eq(collaborators.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (!userExists.length) {
        await db.insert(collaborators).values({ workspaceId, userId: user.id });
      }
    }
    return { data: null, error: null };
  } catch (error) {
    console.error('Error adding collaborators:', error);
    return { data: null, error: 'Failed to add collaborators' };
  }
};

export const removeCollaborators = async (
  users: User[],
  workspaceId: string
) => {
  try {
    for (const user of users) {
      const userExists = await db
        .select({ userId: collaborators.userId })
        .from(collaborators)
        .where(
          and(
            eq(collaborators.userId, user.id),
            eq(collaborators.workspaceId, workspaceId)
          )
        )
        .limit(1);

      if (userExists.length) {
        await db
          .delete(collaborators)
          .where(
            and(
              eq(collaborators.workspaceId, workspaceId),
              eq(collaborators.userId, user.id)
            )
          );
      }
    }
    return { data: null, error: null };
  } catch (error) {
    console.error('Error removing collaborators:', error);
    return { data: null, error: 'Failed to remove collaborators' };
  }
};

export const findUser = async (userId: string) => {
  const response = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  return response;
};

export const getActiveProductsWithPrice = async () => {
  try {
    const res = await db.query.products.findMany({
      where: (pro, { eq }) => eq(pro.active, true),

      with: {
        prices: {
          where: (pri, { eq }) => eq(pri.active, true),
        },
      },
    });
    if (res.length) return { data: res, error: null };
    return { data: [], error: null };
  } catch (error) {
    console.log(error);
    return { data: [], error };
  }
};

export const createFolder = async (folder: Folder) => {
  try {
    const results = await db.insert(folders).values(folder);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const createFile = async (file: File) => {
  try {
    await db.insert(files).values(file);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const updateFolder = async (
  folder: Partial<Folder>,
  folderId: string
) => {
  try {
    await db.update(folders).set(folder).where(eq(folders.id, folderId));
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const updateFile = async (file: Partial<File>, fileId: string) => {
  try {
    const response = await db
      .update(files)
      .set(file)
      .where(eq(files.id, fileId));
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const updateWorkspace = async (
  workspace: Partial<workspace>,
  workspaceId: string
) => {
  if (!workspaceId) return;
  try {
    await db
      .update(workspaces)
      .set(workspace)
      .where(eq(workspaces.id, workspaceId));
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const getCollaborators = async (workspaceId: string) => {
  const response = await db
    .select({ userId: collaborators.userId })
    .from(collaborators)
    .where(eq(collaborators.workspaceId, workspaceId));
  if (!response.length) return [];
  const userInformation: Promise<User | undefined>[] = response.map(
    async (user) => {
      const exists = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, user.userId),
      });
      return exists;
    }
  );
  const resolvedUsers = await Promise.all(userInformation);
  return resolvedUsers.filter(Boolean) as User[];
};

export const getUsersFromSearch = async (email: string) => {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) return [];

  try {
    const accounts = await db
      .select()
      .from(users)
      .where(ilike(users.email, `%${normalizedEmail}%`))
      .limit(10); // Limit results for performance
    return accounts;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

export const getDeletedFolders = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid) return { data: null, error: 'Invalid workspace ID' };

  try {
    const results = await db
      .select()
      .from(folders)
      .where(and(
        eq(folders.workspaceId, workspaceId),
        isNotNull(folders.inTrash)
      ))
      .orderBy(folders.createdAt);
    return { data: results, error: null };
  } catch (error) {
    console.error('Error fetching deleted folders:', error);
    return { data: null, error: 'Error fetching deleted folders' };
  }
};

export const getDeletedFiles = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid) return { data: null, error: 'Invalid workspace ID' };

  try {
    const results = await db
      .select()
      .from(files)
      .where(and(
        eq(files.workspaceId, workspaceId),
        isNotNull(files.inTrash)
      ))
      .orderBy(files.createdAt);
    return { data: results, error: null };
  } catch (error) {
    console.error('Error fetching deleted files:', error);
    return { data: null, error: 'Error fetching deleted files' };
  }
};
