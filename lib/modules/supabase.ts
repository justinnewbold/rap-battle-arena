import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Battle {
  id: string;
  creator_id: string;
  creator_name: string;
  opponent_id?: string;
  opponent_name?: string;
  status: 'waiting' | 'ready' | 'in_progress' | 'round_1' | 'round_2' | 'round_3' | 'judging' | 'completed';
  rounds: number;
  current_round: number;
  winner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  elo_rating: number;
  wins: number;
  losses: number;
  created_at: string;
}

export interface Round {
  id: string;
  battle_id: string;
  round_number: number;
  creator_verse?: string;
  opponent_verse?: string;
  creator_score?: number;
  opponent_score?: number;
  judge_feedback?: string;
  created_at: string;
}

// Helper functions
export async function getBattle(battleId: string): Promise&lt;Battle | null&gt; {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();
  
  if (error) {
    console.error('Error fetching battle:', error);
    return null;
  }
  return data;
}

export async function updateBattleStatus(battleId: string, status: Battle['status']): Promise&lt;boolean&gt; {
  const { error } = await supabase
    .from('battles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', battleId);
  return !error;
}

export async function joinBattle(battleId: string, odId: string, opponentName: string): Promise&lt;boolean&gt; {
  const { error } = await supabase
    .from('battles')
    .update({ 
      opponent_id: odId, 
      opponent_name: opponentName,
      status: 'ready',
      updated_at: new Date().toISOString() 
    })
    .eq('id', battleId);
  return !error;
}
