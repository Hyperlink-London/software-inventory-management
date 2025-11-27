// /components/TagSelector/TagSelector.tsx (Refactored)

'use client';

import * as React from 'react';
import { X, Check, Tag } from 'lucide-react';
import { useTagSelector, TagOption } from '@/hooks/useTagSelector';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

// --- Component Props ---

interface TagSelectorProps {
  /** The current array of selected tag IDs (strings) from the parent state. */
  selectedTagIds: string[];
  /** Callback to update the parent state with the new array of tag IDs. */
  onTagChange: (newTags: string[]) => void;
  /** The full list of available TagOption objects queried from Supabase. */
  availableTags: TagOption[]; // NEW PROP
  /** Placeholder text for the input field. */
  placeholder?: string;
  /** Label for the input section (optional). */
  label?: string;
}

// --- Component ---

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTagIds,
  onTagChange,
  availableTags,
  placeholder = 'Search or create a tag...',
  label = 'Tags',
}) => {
  const [open, setOpen] = React.useState(false);

  const {
    inputValue,
    selectedTagNames,
    setInputValue,
    addTag,
    removeTag,
    filteredOptions,
    canCreateTag,
  } = useTagSelector(selectedTagIds, availableTags, onTagChange);

  // Handle a click on a command item (either existing or new)
  const handleItemSelect = React.useCallback((tagName: string) => {
    addTag(tagName);
    setOpen(false); // Close the popover after selection
  }, [addTag]);

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}

      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 min-h-[1.5rem] items-start pb-1">
        {selectedTagNames.length === 0 ? (
          <p className="text-sm text-muted-foreground pt-1">No tags selected.</p>
        ) : (
          selectedTagNames.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="py-1 pr-1.5 pl-3 text-sm transition-colors"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 rounded-full p-0.5 hover:bg-transparent text-foreground/70 hover:text-red-500"
                onClick={() => {
                  // Find the ID corresponding to the name to remove the correct ID
                  const tagToRemove = availableTags.find(t => t.name === tag);
                  removeTag(tagToRemove ? tagToRemove.id : tag); 
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
      </div>

      {/* Popover/Command Menu for Selection */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal h-10 text-muted-foreground"
          >
             <Tag className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>

              {/* Option to create a new tag */}
              {canCreateTag && (
                <CommandItem
                  onSelect={() => handleItemSelect(inputValue)}
                  className="text-primary font-medium"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Create new tag: **"{inputValue.trim()}"**
                </CommandItem>
              )}
              {canCreateTag && <CommandSeparator />}

              {/* Available Tag Options */}
              <CommandGroup heading="Available Tags">
                {filteredOptions.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleItemSelect(tag.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};