'use client';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { User } from '@/lib/supabase/supabase.types';
import React, { useEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '../ui/label';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { getUsersFromSearch } from '@/lib/supabase/queries';

interface CollaboratorSearchProps {
  existingCollaborators: User[] | [];
  getCollaborator: (collaborator: User) => void;
  children: React.ReactNode;
}

const CollaboratorSearch: React.FC<CollaboratorSearchProps> = ({
  children,
  existingCollaborators,
  getCollaborator,
}) => {
  const { user } = useSupabaseUser();
  const [searchResults, setSearchResults] = useState<User[] | []>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const searchValue = e.target.value.trim();
    
    if (searchValue.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    timerRef.current = setTimeout(async () => {
      try {
        const res = await getUsersFromSearch(searchValue);
        setSearchResults(res);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const addCollaborator = (selectedUser: User) => {
    getCollaborator(selectedUser);
    // Clear search results after adding
    setSearchResults([]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild className="w-full">{children}</SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Search Collaborator</SheetTitle>
          <SheetDescription>
            You can also remove collaborators after adding them from the
            settings tab.
          </SheetDescription>
        </SheetHeader>
        <div
          className="flex justify-center
          items-center
          gap-2
          mt-2
        "
        >
          <Search />
          <Input
            name="name"
            className="dark:bg-background"
            placeholder="Email"
            onChange={onChangeHandler}
          />
        </div>
        <ScrollArea
          className="mt-6
          overflow-y-scroll
          w-full
          rounded-md
        "
        >
          {isSearching && (
            <div className="flex justify-center items-center p-4">
              <div className="text-sm text-muted-foreground">Searching...</div>
            </div>
          )}
          
          {!isSearching && searchResults.length === 0 && (
            <div className="flex justify-center items-center p-4">
              <div className="text-sm text-muted-foreground">
                Start typing an email to search for collaborators
              </div>
            </div>
          )}

          {!isSearching && searchResults
            .filter(
              (result) =>
                !existingCollaborators.some(
                  (existing) => existing.id === result.id
                )
            )
            .filter((result) => result.id !== user?.id)
            .map((searchUser) => (
              <div
                key={searchUser.id}
                className="p-4 flex justify-between items-center border-b border-border/50 last:border-b-0"
              >
                <div className="flex gap-4 items-center">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={searchUser.avatarUrl || "/avatars/7.png"} />
                    <AvatarFallback>
                      {searchUser.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="text-sm font-medium">
                      {searchUser.fullName || 'No name'}
                    </div>
                    <div
                      className="text-xs 
                      text-muted-foreground
                      overflow-hidden 
                      overflow-ellipsis 
                      w-[180px]
                      "
                    >
                      {searchUser.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addCollaborator(searchUser)}
                >
                  Add
                </Button>
              </div>
            ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CollaboratorSearch;
