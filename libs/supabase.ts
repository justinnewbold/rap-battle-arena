import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function getBattle(battleId: string): Promise<Battle | null> {
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

export async function updateBattleStatus(battleId: string, status: Battle['status']): Promise<boolean> {
  const { error } = await supabase
    .from('battles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', battleId);
  
  if (error) {
    console.error('Error updating battle status:', error);
    return false;
  }
  return true;
}

export async function joinBattle(battleId: string, odId: string, opponentName: string): Promise<boolean> {
  const { error } = await supabase
    .from('battles')
    .update({ 
      opponent_id: odId, 
      opponent_name: opponentName,
      status: 'ready',
      updated_at: new Date().toISOString() 
    })
    .eq('id', battleId);
  
  if (error) {
    console.error('Error joining battle:', error);
    return false;
  }
  return true;
}