import { supabase } from './supabaseClient';

/**
 * Fetch homepage settings from the app_settings table.
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const fetchHomepageSettings = async () => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('content')
            .eq('id', 1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned, return empty object to handle gracefully
                return { data: {}, error: null };
            }
            throw error;
        }

        return { data: data?.content || {}, error: null };
    } catch (error) {
        console.error('Error fetching homepage settings:', error);
        return { data: null, error };
    }
};

/**
 * Update homepage settings in the app_settings table.
 * @param {Object} content - The JSON object containing settings.
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateHomepageSettings = async (content) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .upsert(
                { id: 1, content, updated_at: new Date().toISOString() },
                { onConflict: 'id' }
            )
            .select()
            .single();

        if (error) throw error;

        return { data: data?.content, error: null };
    } catch (error) {
        console.error('Error updating homepage settings:', error);
        return { data: null, error };
    }
};
