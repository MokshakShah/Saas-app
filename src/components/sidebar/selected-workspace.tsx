'use client';
import { workspace } from '@/lib/supabase/supabase.types';
import { createClient } from '@/lib/supabase/browser';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SelectedWorkspaceProps {
  workspace: workspace;
  onClick?: (option: workspace) => void;
  isTrigger?: boolean;
  isOpen?: boolean;
}

const SelectedWorkspace: React.FC<SelectedWorkspaceProps> = ({
  workspace,
  onClick,
  isTrigger = false,
  isOpen = false,
}) => {
  const supabase = createClient();
  const [workspaceLogo, setWorkspaceLogo] = useState('/cypresslogo.svg');
  useEffect(() => {
    if (workspace.logo) {
      const path = supabase.storage
        .from('workspace-logos')
        .getPublicUrl(workspace.logo)?.data.publicUrl;
      setWorkspaceLogo(path);
    }
  }, [workspace, supabase.storage]);
  const content = (
    <>
      <Image
        src={workspaceLogo}
        alt="workspace logo"
        width={26}
        height={26}
        objectFit="cover"
      />
      <div className="flex flex-col min-w-0">
        <p
          className="text-lg 
          w-[170px] 
          overflow-hidden 
          overflow-ellipsis 
          whitespace-nowrap"
        >
          {workspace.title}
        </p>
      </div>
      {isTrigger && (
        <div className="ml-auto text-muted-foreground">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      )}
    </>
  );

  if (isTrigger) {
    return (
      <div
        className="flex
        rounded-md
        border
        border-border
        hover:bg-muted
        transition-all
        flex-row
        p-2
        gap-4
        cursor-pointer
        items-center
        my-2"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/${workspace.id}`}
      onClick={() => {
        if (onClick) onClick(workspace);
      }}
      className="flex 
      rounded-md 
      hover:bg-muted 
      transition-all 
      flex-row 
      p-2 
      gap-4 
      justify-center 
      cursor-pointer 
      items-center 
      my-2"
    >
      {content}
    </Link>
  );
};

export default SelectedWorkspace;
