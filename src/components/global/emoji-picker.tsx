'use client';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface EmojiPickerProps {
  children: React.ReactNode;
  getValue?: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ children, getValue }) => {
  const [open, setOpen] = useState(false);
  const onClick = (selectedEmoji: any) => {
    if (getValue) getValue(selectedEmoji.emoji);
    setOpen(false);
  };
  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="cursor-pointer">{children}</PopoverTrigger>
        <PopoverContent
          className="p-0
          border-none
        "
        >
          <Picker onEmojiClick={onClick} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EmojiPicker;
