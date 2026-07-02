'use client';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import CypressPageIcon from '../icons/cypressPageIcon';
import clsx from 'clsx';

interface MobileSidebarProps {
  children: React.ReactNode;
}

export const nativeNavigations = [
  {
    title: 'Sidebar',
    id: 'sidebar',
    customIcon: Menu,
  },
  {
    title: 'Pages',
    id: 'pages',
    customIcon: CypressPageIcon,
  },
] as const;

const MobileSidebar: React.FC<MobileSidebarProps> = ({ children }) => {
  const [selectedNav, setSelectedNav] = useState('');

  const handleNavClick = (id: string) => {
    // Tapping the active item again closes it
    setSelectedNav((prev) => (prev === id ? '' : id));
  };

  return (
    <>
      {selectedNav === 'sidebar' && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          {/* Backdrop — tap outside to close */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedNav('')}
          />
          {/* Sidebar panel */}
          <div className="relative z-50 w-[280px] h-full bg-background overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedNav('')}
              className="absolute top-3 right-3 z-50 p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
            {children}
          </div>
        </div>
      )}
      <nav
        className="bg-black/10
      backdrop-blur-lg
      sm:hidden 
      fixed 
      z-50 
      bottom-0 
      right-0 
      left-0
      "
      >
        <ul
          className="flex 
        justify-between 
        items-center 
        p-4"
        >
          {nativeNavigations.map((item) => (
            <li
              className="flex
              items-center
              flex-col
              justify-center
            "
              key={item.id}
              onClick={() => handleNavClick(item.id)}
            >
              <item.customIcon />
              <small
                className={clsx('', {
                  'text-muted-foreground': selectedNav !== item.id,
                })}
              >
                {item.title}
              </small>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default MobileSidebar;
