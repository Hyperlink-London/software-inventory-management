import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient" // Adjust the import path as necessary


/**
 * @typedef {object} Tag
 * @property {string} id
 * @property {string} name
 */

/**
 * Simulates fetching all tags from the Supabase 'tags' table.
 * (Replace this with your actual Supabase client code)
 * @returns {Promise<Tag[]>}
 */
const fetchAllTags = async () => {
    // Actual Supabase call:
    const { data, error } = await supabase.from('tags').select('id, name');
    if (error) throw error;
    return data;
};
// ----------------------------


/**
 * Hook to handle fetching and state of all available tags.
 * @returns {{tags: Tag[], loading: boolean}}
 */
export const useTagsData = () => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const fetchedTags = await fetchAllTags();
                setTags(fetchedTags);
            } catch (error) {
                console.error("Error loading tags:", error);
            } finally {
                setLoading(false);
            }
        };
        loadTags();
    }, []);
    
    // In a production app, you might also include a refetch function here:
    // return { tags, loading, refetchTags };

    return { tags, loading };
};