'use client';
import { appFoldersType, useAppState } from '@/lib/providers/state-provider';
import { File } from '@/lib/supabase/supabase.types';
import { FileIcon, FolderIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { getDeletedFolders, getDeletedFiles } from '@/lib/supabase/queries';

const TrashRestore = () => {
  const { state, workspaceId } = useAppState();
  const [folders, setFolders] = useState<appFoldersType[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeletedItems = async () => {
      if (!workspaceId) return;
      
      setIsLoading(true);
      try {
        // Fetch deleted folders and files from database
        const [deletedFoldersResult, deletedFilesResult] = await Promise.all([
          getDeletedFolders(workspaceId),
          getDeletedFiles(workspaceId)
        ]);

        if (deletedFoldersResult.data) {
          setFolders(deletedFoldersResult.data as appFoldersType[]);
        }

        if (deletedFilesResult.data) {
          setFiles(deletedFilesResult.data);
        }
      } catch (error) {
        console.error('Error fetching deleted items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeletedItems();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-muted-foreground">Loading deleted items...</div>
      </div>
    );
  }

  return (
    <section>
      {!!folders.length && (
        <>
          <h3 className="text-lg font-semibold mb-4">Folders</h3>
          {folders.map((folder) => (
            <Link
              className="hover:bg-muted
            rounded-md
            p-2
            flex
            items-center
            justify-between
            mb-2"
              href={`/dashboard/${folder.workspaceId}/${folder.id}`}
              key={folder.id}
            >
              <article>
                <aside className="flex items-center gap-2">
                  <FolderIcon size={16} />
                  <span>{folder.title}</span>
                </aside>
                <div className="text-xs text-muted-foreground mt-1">
                  {folder.inTrash}
                </div>
              </article>
            </Link>
          ))}
        </>
      )}
      {!!files.length && (
        <>
          <h3 className="text-lg font-semibold mb-4 mt-6">Files</h3>
          {files.map((file) => (
            <Link
              key={file.id}
              className="hover:bg-muted rounded-md p-2 flex items-center justify-between mb-2"
              href={`/dashboard/${file.workspaceId}/${file.folderId}/${file.id}`}
            >
              <article>
                <aside className="flex items-center gap-2">
                  <FileIcon size={16} />
                  <span>{file.title}</span>
                </aside>
                <div className="text-xs text-muted-foreground mt-1">
                  {file.inTrash}
                </div>
              </article>
            </Link>
          ))}
        </>
      )}
      {!files.length && !folders.length && !isLoading && (
        <div
          className="
          text-muted-foreground
          absolute
          top-[50%]
          left-[50%]
          transform
          -translate-x-1/2
          -translate-y-1/2
          text-center
      "
        >
          <div className="text-lg mb-2">🗑️</div>
          <div>No Items in trash</div>
        </div>
      )}
    </section>
  );
};

export default TrashRestore;
