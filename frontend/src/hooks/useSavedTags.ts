/**
 * useSavedTags - Hook for managing saved tags
 * 
 * Stores saved tags in localStorage and provides methods to save/unsave.
 * Also tracks tag counts from feed items.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'feedprism_saved_tags';

interface TagWithCount {
    tag: string;
    count: number;
}

interface UseSavedTagsReturn {
    savedTags: string[];
    savedTagsWithCounts: TagWithCount[];
    selectedTags: string[];
    saveTag: (tag: string) => void;
    unsaveTag: (tag: string) => void;
    toggleSaveTag: (tag: string) => void;
    isSaved: (tag: string) => boolean;
    toggleSelectedTag: (tag: string) => void;
    clearSelectedTags: () => void;
    updateTagCounts: (items: Array<{ tags?: string[] }>) => void;
}

export function useSavedTags(): UseSavedTagsReturn {
    // Saved tags (persisted to localStorage)
    const [savedTags, setSavedTags] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Tag counts (computed from feed items)
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});

    // Currently selected tags for filtering
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Persist saved tags to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTags));
        } catch (e) {
            console.error('Failed to save tags to localStorage:', e);
        }
    }, [savedTags]);

    // Save a tag
    const saveTag = useCallback((tag: string) => {
        setSavedTags((prev) => {
            if (prev.includes(tag)) return prev;
            return [...prev, tag];
        });
    }, []);

    // Unsave a tag
    const unsaveTag = useCallback((tag: string) => {
        setSavedTags((prev) => prev.filter((t) => t !== tag));
        // Also remove from selected if it was selected
        setSelectedTags((prev) => prev.filter((t) => t !== tag));
    }, []);

    // Toggle save state
    const toggleSaveTag = useCallback((tag: string) => {
        setSavedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((t) => t !== tag);
            }
            return [...prev, tag];
        });
    }, []);

    // Check if a tag is saved
    const isSaved = useCallback((tag: string) => {
        return savedTags.includes(tag);
    }, [savedTags]);

    // Toggle selected tag for filtering
    const toggleSelectedTag = useCallback((tag: string) => {
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((t) => t !== tag);
            }
            return [...prev, tag];
        });
    }, []);

    // Clear all selected tags
    const clearSelectedTags = useCallback(() => {
        setSelectedTags([]);
    }, []);

    // Update tag counts from feed items
    const updateTagCounts = useCallback((items: Array<{ tags?: string[] }>) => {
        const counts: Record<string, number> = {};
        items.forEach((item) => {
            item.tags?.forEach((tag) => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        setTagCounts(counts);
    }, []);

    // Saved tags with counts, sorted by count
    const savedTagsWithCounts: TagWithCount[] = savedTags
        .map((tag) => ({
            tag,
            count: tagCounts[tag] || 0,
        }))
        .sort((a, b) => b.count - a.count);

    return {
        savedTags,
        savedTagsWithCounts,
        selectedTags,
        saveTag,
        unsaveTag,
        toggleSaveTag,
        isSaved,
        toggleSelectedTag,
        clearSelectedTags,
        updateTagCounts,
    };
}

export default useSavedTags;
