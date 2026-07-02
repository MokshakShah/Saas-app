'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { File, Folder, workspace } from '@/lib/supabase/supabase.types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import 'quill/dist/quill.snow.css';
import { Button } from '../ui/button';
import {
  deleteFile,
  deleteFolder,
  findUser,
  getFileDetails,
  getFolderDetails,
  getWorkspaceDetails,
  updateFile,
  updateFolder,
  updateWorkspace,
} from '@/lib/supabase/queries';
import { usePathname, useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/browser';
import EmojiPicker from '../global/emoji-picker';
import BannerUpload from '../banner-upload/banner-upload';
import { XCircleIcon } from 'lucide-react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';

interface QuillEditorProps {
  dirDetails: File | Folder | workspace;
  fileId: string;
  dirType: 'workspace' | 'folder' | 'file';
}

var TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ header: 1 }, { header: 2 }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }],
  ['clean'],
];

const QuillEditor: React.FC<QuillEditorProps> = ({
  dirDetails,
  dirType,
  fileId,
}) => {
  const supabase = createClient();
  const { state, workspaceId, folderId, dispatch } = useAppState();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = useRef<any>(null);
  // Holds the live Supabase Realtime channel for this document room
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { user } = useSupabaseUser();
  const router = useRouter();
  const pathname = usePathname();
  const [quill, setQuill] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<
    { id: string; email: string; avatarUrl: string }[]
  >([]);
  const [deletingBanner, setDeletingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localCursors, setLocalCursors] = useState<any>([]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const details = useMemo(() => {
    let selectedDir;
    if (dirType === 'file') {
      selectedDir = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === folderId)
        ?.files.find((file) => file.id === fileId);
    }
    if (dirType === 'folder') {
      selectedDir = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === fileId);
    }
    if (dirType === 'workspace') {
      selectedDir = state.workspaces.find(
        (workspace) => workspace.id === fileId
      );
    }

    if (selectedDir) return selectedDir;

    return {
      title: dirDetails.title,
      iconId: dirDetails.iconId,
      createdAt: dirDetails.createdAt,
      data: dirDetails.data,
      inTrash: dirDetails.inTrash,
      bannerUrl: dirDetails.bannerUrl,
    } as workspace | Folder | File;
  }, [
    state,
    workspaceId,
    folderId,
    dirDetails.bannerUrl,
    dirDetails.createdAt,
    dirDetails.data,
    dirDetails.iconId,
    dirDetails.inTrash,
    dirDetails.title,
    dirType,
    fileId,
  ]);

  const breadCrumbs = useMemo(() => {
    if (!pathname || !state.workspaces || !workspaceId) return;
    const segments = pathname
      .split('/')
      .filter((val) => val !== 'dashboard' && val);
    const workspaceDetails = state.workspaces.find(
      (workspace) => workspace.id === workspaceId
    );
    const workspaceBreadCrumb = workspaceDetails
      ? `${workspaceDetails.iconId} ${workspaceDetails.title}`
      : '';
    if (segments.length === 1) return workspaceBreadCrumb;

    const folderSegment = segments[1];
    const folderDetails = workspaceDetails?.folders.find(
      (folder) => folder.id === folderSegment
    );
    const folderBreadCrumb = folderDetails
      ? `/ ${folderDetails.iconId} ${folderDetails.title}`
      : '';
    if (segments.length === 2) return `${workspaceBreadCrumb} ${folderBreadCrumb}`;

    const fileSegment = segments[2];
    const fileDetails = folderDetails?.files.find(
      (file) => file.id === fileSegment
    );
    const fileBreadCrumb = fileDetails
      ? `/ ${fileDetails.iconId} ${fileDetails.title}`
      : '';

    return `${workspaceBreadCrumb} ${folderBreadCrumb} ${fileBreadCrumb}`;
  }, [state, pathname, workspaceId]);

  // ---------------------------------------------------------------------------
  // Quill initialisation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const initializeEditor = async () => {
      if (typeof window === 'undefined') return;
      const wrapper = editorContainerRef.current;
      if (!wrapper || quillInstanceRef.current) return;

      wrapper.innerHTML = '';
      const editor = document.createElement('div');
      wrapper.append(editor);

      const Quill = (await import('quill')).default;
      const QuillCursors = (await import('quill-cursors')).default;

      if (cancelled || !wrapper.isConnected || editor.parentElement !== wrapper) return;

      Quill.register('modules/cursors', QuillCursors);
      const instance = new Quill(editor, {
        theme: 'snow',
        modules: {
          toolbar: TOOLBAR_OPTIONS,
          cursors: { transformOnTextChange: true },
        },
      });

      if (cancelled) return;
      quillInstanceRef.current = instance;
      setQuill(instance);
    };

    initializeEditor();

    return () => {
      cancelled = true;
      quillInstanceRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Load document content from DB
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!fileId) return;
    const fetchInformation = async () => {
      if (dirType === 'file') {
        const { data: selectedDir, error } = await getFileDetails(fileId);
        if (error || !selectedDir) return router.replace('/dashboard');
        if (!selectedDir[0]) {
          if (!workspaceId) return;
          return router.replace(`/dashboard/${workspaceId}`);
        }
        if (!workspaceId || quill === null) return;
        if (!selectedDir[0].data) return;
        quill.setContents(JSON.parse(selectedDir[0].data || ''));
        dispatch({
          type: 'UPDATE_FILE',
          payload: {
            file: { data: selectedDir[0].data },
            fileId,
            folderId: selectedDir[0].folderId,
            workspaceId,
          },
        });
      }
      if (dirType === 'folder') {
        const { data: selectedDir, error } = await getFolderDetails(fileId);
        if (error || !selectedDir) return router.replace('/dashboard');
        if (!selectedDir[0]) router.replace(`/dashboard/${workspaceId}`);
        if (quill === null) return;
        if (!selectedDir[0].data) return;
        quill.setContents(JSON.parse(selectedDir[0].data || ''));
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            folderId: fileId,
            folder: { data: selectedDir[0].data },
            workspaceId: selectedDir[0].workspaceId,
          },
        });
      }
      if (dirType === 'workspace') {
        const { data: selectedDir, error } = await getWorkspaceDetails(fileId);
        if (error || !selectedDir) return router.replace('/dashboard');
        if (!selectedDir[0] || quill === null) return;
        if (!selectedDir[0].data) return;
        quill.setContents(JSON.parse(selectedDir[0].data || ''));
        dispatch({
          type: 'UPDATE_WORKSPACE',
          payload: {
            workspace: { data: selectedDir[0].data },
            workspaceId: fileId,
          },
        });
      }
    };
    fetchInformation();
  }, [fileId, workspaceId, quill, dirType, router]);

  // ---------------------------------------------------------------------------
  // Supabase Realtime channel — Presence + Broadcast
  // One channel per document room, handles:
  //   • Presence  → who is online, cursor colours
  //   • Broadcast send-changes  → live delta sync
  //   • Broadcast send-cursor-move → live cursor positions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!fileId || quill === null || !user) return;

    // Use a stable channel name so all collaborators join the same room
    const room = supabase.channel(`room:${fileId}`, {
      config: {
        broadcast: { self: false }, // don't echo our own broadcasts back to us
        presence: { key: user.id },
      },
    });

    // --- Presence: track who is in the room ----------------------------------
    room.on('presence', { event: 'sync' }, () => {
      const newState = room.presenceState();
      const newCollaborators = Object.values(newState).flat() as any;
      setCollaborators(newCollaborators);

      const allCursors: any[] = [];
      newCollaborators.forEach(
        (collaborator: { id: string; email: string; avatarUrl: string }) => {
          if (collaborator.id !== user.id) {
            const userCursor = quill.getModule('cursors');
            userCursor.createCursor(
              collaborator.id,
              collaborator.email.split('@')[0],
              `#${Math.random().toString(16).slice(2, 8)}`
            );
            allCursors.push(userCursor);
          }
        }
      );
      setLocalCursors(allCursors);
    });

    // --- Broadcast: receive delta changes from other users -------------------
    room.on('broadcast', { event: 'send-changes' }, ({ payload }) => {
      if (payload?.delta) {
        quill.updateContents(payload.delta);
      }
    });

    // --- Broadcast: receive cursor moves from other users --------------------
    room.on('broadcast', { event: 'send-cursor-move' }, ({ payload }) => {
      if (!payload) return;
      const cursorToMove = localCursors.find(
        (c: any) => c.cursors()?.[0].id === payload.cursorId
      );
      if (cursorToMove) {
        cursorToMove.moveCursor(payload.cursorId, payload.range);
      }
    });

    room.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const response = await findUser(user.id);
      if (!response) return;

      room.track({
        id: user.id,
        email: user.email?.split('@')[0],
        avatarUrl: response.avatarUrl
          ? supabase.storage
              .from('avatars')
              .getPublicUrl(response.avatarUrl).data.publicUrl
          : '',
      });
    });

    channelRef.current = room;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(room);
    };
    // localCursors intentionally excluded — the cursor move handler reads it
    // via closure but we don't want to recreate the channel on every cursor update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, quill, supabase, user]);

  // ---------------------------------------------------------------------------
  // Send changes & cursor moves via Supabase Broadcast
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (quill === null || !fileId || !user) return;

    const selectionChangeHandler = (range: any, _oldRange: any, source: any) => {
      if (source !== 'user' || !range) return;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'send-cursor-move',
        payload: { range, cursorId: user.id },
      });
    };

    const quillHandler = (delta: any, _oldDelta: any, source: any) => {
      if (source !== 'user') return;

      // Broadcast the delta immediately so other users see it in real time
      channelRef.current?.send({
        type: 'broadcast',
        event: 'send-changes',
        payload: { delta },
      });

      // Debounced save to DB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaving(true);
      const contents = quill.getContents();
      const quillLength = quill.getLength();
      saveTimerRef.current = setTimeout(async () => {
        if (contents && quillLength !== 1 && fileId) {
          if (dirType === 'workspace') {
            dispatch({
              type: 'UPDATE_WORKSPACE',
              payload: {
                workspace: { data: JSON.stringify(contents) },
                workspaceId: fileId,
              },
            });
            await updateWorkspace({ data: JSON.stringify(contents) }, fileId);
          }
          if (dirType === 'folder') {
            if (!workspaceId) return;
            dispatch({
              type: 'UPDATE_FOLDER',
              payload: {
                folder: { data: JSON.stringify(contents) },
                workspaceId,
                folderId: fileId,
              },
            });
            await updateFolder({ data: JSON.stringify(contents) }, fileId);
          }
          if (dirType === 'file') {
            if (!workspaceId || !folderId) return;
            dispatch({
              type: 'UPDATE_FILE',
              payload: {
                file: { data: JSON.stringify(contents) },
                workspaceId,
                folderId: folderId,
                fileId,
              },
            });
            await updateFile({ data: JSON.stringify(contents) }, fileId);
          }
        }
        setSaving(false);
      }, 850);
    };

    quill.on('text-change', quillHandler);
    quill.on('selection-change', selectionChangeHandler);

    return () => {
      quill.off('text-change', quillHandler);
      quill.off('selection-change', selectionChangeHandler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [quill, fileId, user, details, folderId, workspaceId, dirType, dispatch]);

  // ---------------------------------------------------------------------------
  // File action handlers
  // ---------------------------------------------------------------------------
  const restoreFileHandler = async () => {
    if (dirType === 'file') {
      if (!folderId || !workspaceId) return;
      dispatch({
        type: 'UPDATE_FILE',
        payload: { file: { inTrash: '' }, fileId, folderId, workspaceId },
      });
      await updateFile({ inTrash: '' }, fileId);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: { folder: { inTrash: '' }, folderId: fileId, workspaceId },
      });
      await updateFolder({ inTrash: '' }, fileId);
    }
  };

  const deleteFileHandler = async () => {
    if (dirType === 'file') {
      if (!folderId || !workspaceId) return;
      dispatch({
        type: 'DELETE_FILE',
        payload: { fileId, folderId, workspaceId },
      });
      await deleteFile(fileId);
      router.replace(`/dashboard/${workspaceId}`);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'DELETE_FOLDER',
        payload: { folderId: fileId, workspaceId },
      });
      await deleteFolder(fileId);
      router.replace(`/dashboard/${workspaceId}`);
    }
  };

  const iconOnChange = async (icon: string) => {
    if (!fileId) return;
    if (dirType === 'workspace') {
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { workspace: { iconId: icon }, workspaceId: fileId },
      });
      await updateWorkspace({ iconId: icon }, fileId);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: { folder: { iconId: icon }, workspaceId, folderId: fileId },
      });
      await updateFolder({ iconId: icon }, fileId);
    }
    if (dirType === 'file') {
      if (!workspaceId || !folderId) return;
      dispatch({
        type: 'UPDATE_FILE',
        payload: { file: { iconId: icon }, workspaceId, folderId, fileId },
      });
      await updateFile({ iconId: icon }, fileId);
    }
  };

  const deleteBanner = async () => {
    if (!fileId) return;
    if (dirType === 'file' && (!folderId || !workspaceId)) return;
    if (dirType === 'folder' && !workspaceId) return;
    setDeletingBanner(true);
    try {
      await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);

      if (dirType === 'file') {
        if (!workspaceId || !folderId) return;
        dispatch({
          type: 'UPDATE_FILE',
          payload: { file: { bannerUrl: '' }, fileId, folderId, workspaceId },
        });
        await updateFile({ bannerUrl: '' }, fileId);
      }
      if (dirType === 'folder') {
        if (!workspaceId) return;
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: { folder: { bannerUrl: '' }, folderId: fileId, workspaceId },
        });
        await updateFolder({ bannerUrl: '' }, fileId);
      }
      if (dirType === 'workspace') {
        dispatch({
          type: 'UPDATE_WORKSPACE',
          payload: { workspace: { bannerUrl: '' }, workspaceId: fileId },
        });
        await updateWorkspace({ bannerUrl: '' }, fileId);
      }
    } finally {
      setDeletingBanner(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <div className="relative">
        {details.inTrash && (
          <article
            className="py-2 
          z-40 
          bg-[#EB5757] 
          flex  
          md:flex-row 
          flex-col 
          justify-center 
          items-center 
          gap-4 
          flex-wrap"
          >
            <div
              className="flex 
            flex-col 
            md:flex-row 
            gap-2 
            justify-center 
            items-center"
            >
              <span className="text-white">
                This {dirType} is in the trash.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-[#EB5757]"
                onClick={restoreFileHandler}
              >
                Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-[#EB5757]"
                onClick={deleteFileHandler}
              >
                Delete
              </Button>
            </div>
            <span className="text-sm text-white">{details.inTrash}</span>
          </article>
        )}
        <div
          className="flex 
        flex-col-reverse 
        sm:flex-row 
        sm:justify-between 
        justify-center 
        sm:items-center 
        sm:p-2 
        p-8"
        >
          <div>{breadCrumbs}</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10">
              {collaborators?.map((collaborator) => (
                <TooltipProvider key={collaborator.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar
                        className="-ml-3 bg-background border-2 flex items-center justify-center border-white h-8 w-8 rounded-full"
                      >
                        <AvatarImage
                          src={collaborator.avatarUrl ?? ''}
                          className="rounded-full"
                        />
                        <AvatarFallback>
                          {collaborator.email.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{collaborator.email}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            {saving ? (
              <Badge
                variant="secondary"
                className="bg-orange-600 top-4 text-white right-4 z-50"
              >
                Saving...
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-emerald-600 top-4 text-white right-4 z-50"
              >
                Saved
              </Badge>
            )}
          </div>
        </div>
      </div>
      {details.bannerUrl && (
        <div className="relative w-full h-[200px]">
          <Image
            src={
              supabase.storage
                .from('file-banners')
                .getPublicUrl(details.bannerUrl).data.publicUrl
            }
            fill
            className="w-full md:h-48 h-20 object-cover"
            alt="Banner Image"
          />
        </div>
      )}
      <div
        className="flex 
        justify-center
        items-center
        flex-col
        mt-2
        relative
      "
      >
        <div
          className="w-full 
        self-center 
        max-w-[800px] 
        flex 
        flex-col
         px-7 
         lg:my-8"
        >
          <div className="text-[80px]">
            <EmojiPicker getValue={iconOnChange}>
              <div
                className="w-[100px]
                cursor-pointer
                transition-colors
                h-[100px]
                flex
                items-center
                justify-center
                hover:bg-muted
                rounded-xl"
              >
                {details.iconId}
              </div>
            </EmojiPicker>
          </div>
          <div className="flex">
            <BannerUpload
              id={fileId}
              dirType={dirType}
              className="mt-2 text-sm text-muted-foreground p-2 hover:text-card-foreground transition-all rounded-md"
            >
              {details.bannerUrl ? 'Update Banner' : 'Add Banner'}
            </BannerUpload>
            {details.bannerUrl && (
              <Button
                disabled={deletingBanner}
                onClick={deleteBanner}
                variant="ghost"
                className="gap-2 hover:bg-background flex item-center justify-center mt-2 text-sm text-muted-foreground w-36 p-2 rounded-md"
              >
                <XCircleIcon size={16} />
                <span className="whitespace-nowrap font-normal">
                  Remove Banner
                </span>
              </Button>
            )}
          </div>
          <span className="text-muted-foreground text-3xl font-bold h-9">
            {details.title}
          </span>
          <span className="text-muted-foreground text-sm">
            {dirType.toUpperCase()}
          </span>
        </div>
        <div
          id="container"
          className="max-w-[800px]"
          ref={editorContainerRef}
        ></div>
      </div>
    </>
  );
};

export default QuillEditor;
