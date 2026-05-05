import { supabase } from './supabaseClient';

export const modelActivityService = {
  /**
   * Fetch all agency visits/submissions for a user
   */
  async getAgencyVisits(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('agency_visits')
      .select('*')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching agency visits:', error);
      throw error;
    }
    return data;
  },

  /**
   * Add a new agency visit or PPT profile submission log
   */
  async addAgencyVisit(visitData) {
    const { data, error } = await supabase
      .from('agency_visits')
      .insert([visitData])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding agency visit:', error);
      throw error;
    }
    return data;
  },

  /**
   * Fetch casting records for a user
   */
  async getCastingRecords(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('casting_records')
        .select('*')
        .eq('user_id', userId)
        .order('casting_date', { ascending: false });
      
      if (error) {
        console.warn('casting_records table may not exist yet:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('getCastingRecords failed:', e);
      return [];
    }
  },

  /**
   * Add a new casting record
   */
  async addCastingRecord(castingData) {
    const { data, error } = await supabase
      .from('casting_records')
      .insert([castingData])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding casting record:', error);
      throw error;
    }
    return data;
  },

  /**
   * Fetch gamification badges for a user
   */
  async getUserBadges(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user badges:', error);
      throw error;
    }
    return data;
  }
};
