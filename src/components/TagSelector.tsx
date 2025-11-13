import React, { useState, useRef } from 'react';
import { Check, ChevronsUpDown, X, PlusCircle, Loader2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { useTagsData } from '@/hooks/useTagsData'; 



interface TagSelectorProps {
    selectedTagIds: string[];
    onTagChange: (tagIds: string[]) => void;
}

/**
 * A multi-select component for selecting and displaying tags using Shadcn UI components.
 */
export function TagSelector({ selectedTagIds, onTagChange }: TagSelectorProps) {
    // Fetches all available tags and their loading state
    const { tags, loading } = useTagsData(); 
    
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Derived state for easy filtering
    const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
    const availableTags = tags.filter(tag => !selectedTagIds.includes(tag.id));

    const handleSelect = (tagId: string) => {
        const isSelected = selectedTagIds.includes(tagId);
        let newSelection: string[];

        if (isSelected) {
            // Deselect: remove tagId
            newSelection = selectedTagIds.filter(id => id !== tagId);
        } else {
            // Select: add tagId
            newSelection = [...selectedTagIds, tagId];
        }
        onTagChange(newSelection);
        setSearch(''); 
        
        // Return focus to the trigger button after selection
        setTimeout(() => triggerRef.current?.focus(), 0);
    };

    const handleRemoveTag = (e: React.MouseEvent, tagId: string) => {
        e.stopPropagation(); // Prevents the popover from toggling
        handleSelect(tagId);
    };

    const handleTogglePopover = () => {
        setOpen(current => !current);
        if (!open) setSearch(''); // Clear search when opening
    };

    // Filter tags to display in the dropdown list
    const filteredAvailableTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(search.toLowerCase())
    );
    
    // Filter selected tags for quick deselection if the search bar is used
    const filteredSelectedTags = selectedTags.filter(tag =>
        tag.name.toLowerCase().includes(search.toLowerCase())
    );


    return (
        <div className="flex flex-col space-y-2 w-full">
            <Label>Tags</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        ref={triggerRef}
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[40px] p-1 pr-3 shadow-sm"
                        disabled={loading}
                        onClick={handleTogglePopover} // Explicitly handle toggle
                    >
                        {loading ? (
                             <span className="text-slate-500 font-normal ml-2 flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tags...
                             </span>
                        ) : selectedTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 items-center py-1">
                                {selectedTags.map(tag => (
                                    <Badge 
                                        key={tag.id} 
                                        className="bg-blue-600 hover:bg-blue-700 text-black flex items-center gap-2 transition-colors"
                                    >
                                        {tag.name}
                                        {/* X icon is removed */}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <span className="text-slate-500 font-normal ml-2">Select tags...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent 
                    align="start" 
                    className='w-[--radix-popover-trigger-width] p-0 z-50 bg-white'
                > 
                    <Command>
                        {/* FIX 1: Reduced CommandInput size and padding (h-8 and pl-2) */}
                        <CommandInput 
                            placeholder="Search tags..." 
                            value={search} 
                            onValueChange={setSearch}
                            className="flex h-8 w-full rounded-md border-b border-input bg-transparent py-1 pl-2 pr-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        
                        <CommandEmpty>
                            {loading ? "Loading tags..." : `No tags found matching "${search}".`}
                        </CommandEmpty>
                        
                        {!loading && (
                            <div className="max-h-60 overflow-y-auto">
                                {/* FIX 3: Removed custom padding from CommandGroup */}
                                {filteredSelectedTags.length > 0 && (
                                    <CommandGroup heading="Selected"> 
                                        {filteredSelectedTags.map(tag => (
                                            <CommandItem
                                                key={tag.id}
                                                value={tag.name} 
                                                onSelect={() => handleSelect(tag.id)}
                                                // FIX 2: Explicitly set py-1 for tighter vertical spacing
                                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            >
                                                <Check className="mr-2 h-4 w-4 text-blue-600" />
                                                {tag.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {/* FIX 3: Removed custom padding from CommandGroup */}
                                {filteredAvailableTags.length > 0 && (
                                    <CommandGroup heading="Available Tags">
                                        {filteredAvailableTags.map(tag => (
                                            <CommandItem
                                                key={tag.id}
                                                value={tag.name} 
                                                onSelect={() => handleSelect(tag.id)}
                                                // FIX 2: Explicitly set py-1 for tighter vertical spacing
                                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            >
                                                {/* Checkmark is removed for unselected tags */}
                                                <div className="mr-2 h-4 w-4" /> 
                                                {tag.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                
                                {/* "Add New Tag" Option Placeholder */}
                                {search && (
                                    <CommandGroup>
                                        <Separator />
                                        {/* FIX 2: Explicitly set py-1 for tighter vertical spacing */}
                                        <CommandItem
                                            onSelect={() => {
                                                console.log(`ACTION: Prompt to add new tag: "${search}"`);
                                                setOpen(false);
                                                // TODO: Implement logic to create a new tag and add its ID to the selection
                                            }}
                                            className="justify-center text-blue-600 hover:text-blue-800 relative flex cursor-default select-none items-center rounded-sm px-2 py-1 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add New Tag: "{search}"
                                        </CommandItem>
                                    </CommandGroup>
                                )}
                            </div>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}