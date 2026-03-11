import MobileSidebar from '@/components/sidebar/mobile-sidebar';
import Sidebar from '@/components/sidebar/sidebar';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}

const Layout = async ({ children, params }: LayoutProps) => {
  const resolvedParams = await params;
  return (
    <main
      className="flex overflow-hidden
      h-screen
      w-screen
  "
    >
      <Sidebar params={resolvedParams} />
      <MobileSidebar>
        <Sidebar
          params={resolvedParams}
          className="w-screen inline-block sm:hidden"
        />
      </MobileSidebar>
      <div
        className="dark:boder-Neutrals-12/70
        border-l-[1px]
        w-full
        relative
        overflow-scroll
      "
      >
        {children}
      </div>
    </main>
  );
};

export default Layout;
