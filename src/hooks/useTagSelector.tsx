// /hooks/useTagSelector.ts

import { useState, useCallback, useMemo } from 'react';

// Define the expected structure for tags queried from Supabase
export interface TagOption {
  id: string;   // The unique ID from the database
  name: string; // The display name of the tag
}

/**
 * Custom hook for managing a tag selector that supports selection from pre-existing options.
 * * @param selectedTagIds - The array of currently selected tag IDs (strings) passed from the parent.
 * @param availableTags - The full list of available TagOption objects queried from Supabase.
 * @param onTagChange - Callback to update the parent state with the new array of selected tag IDs.
 */
export const useTagSelector = (
  selectedTagIds: string[] = [], // Safely default to []
  availableTags: TagOption[] = [], // Safely default to []
  onTagChange: (newTags: string[]) => void
) => {
  const [inputValue, setInputValue] = useState('');

  // ---------------- Helper Mappings ----------------
  
  // Map selected IDs back to their names for display in the component
  const selectedTagNames = useMemo(() => {
    return selectedTagIds.map(id => {
      const tag = availableTags.find(t => t.id === id);
      // Fallback to ID if name isn't found (for new/pending tags)
      return tag ? tag.name : id; 
    });
  }, [selectedTagIds, availableTags]);

  // ---------------- Logic for Adding/Removing Tags ----------------

  const addTag = useCallback((tagIdOrName: string) => {
    const tagName = tagIdOrName.trim();
    if (!tagName) return;

    // 1. Check if the tag is an existing option by name
    const existingTag = availableTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    
    // 2. Get the ID we need to save. Use the existing ID or the name itself for new tags.
    const newId = existingTag ? existingTag.id : tagName;

    if (!selectedTagIds.includes(newId)) {
      const newTags = [...selectedTagIds, newId];
      onTagChange(newTags);
    }
    
    // Clear the input after selection/addition
    setInputValue('');
  }, [selectedTagIds, availableTags, onTagChange]);

  const removeTag = useCallback((tagId: string) => {
    const newTags = selectedTagIds.filter(id => id !== tagId);
    onTagChange(newTags);
  }, [selectedTagIds, onTagChange]);

  // ---------------- Logic for Filtering/Creating Options ----------------

  const filteredOptions = useMemo(() => {
    // 1. Filter out tags that are already selected
    const unselectedTags = availableTags.filter(
      (tag) => !selectedTagIds.includes(tag.id)
    );

    // 2. Filter options based on input value
    return unselectedTags.filter((tag) =>
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [availableTags, selectedTagIds, inputValue]);

  // 3. Check if the current input value can be created as a new tag
  const canCreateTag = useMemo(() => {
    const sanitizedInput = inputValue.trim();
    return (
      sanitizedInput.length > 0 && 
      !selectedTagNames.includes(sanitizedInput) && // Not already selected
      !availableTags.some(tag => tag.name.toLowerCase() === sanitizedInput.toLowerCase()) // Not already in the available list
    );
  }, [inputValue, selectedTagNames, availableTags]);

  return useMemo(() => ({
    inputValue,
    selectedTagIds, // The IDs we pass to the form
    selectedTagNames, // The names used for display
    setInputValue,
    addTag,
    removeTag,
    filteredOptions,
    canCreateTag,
  }), [inputValue, selectedTagIds, selectedTagNames, setInputValue, addTag, removeTag, filteredOptions, canCreateTag]);
};