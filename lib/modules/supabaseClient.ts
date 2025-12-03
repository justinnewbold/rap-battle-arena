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
  status: string;
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

export async function getBattle(battleId: string) {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();
  
  if (error) return null;
  return data;
}

export async function updateBattleStatus(battleId: string, status: string) {
  const { error } = await supabase
    .from('battles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', battleId);
  return !error;
}

export async function joinBattle(battleId: string, odId: string, opponentName: string) {
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
