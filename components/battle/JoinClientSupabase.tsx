'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BattleData {
  id: string;
  creator_id: string;
  creator_name: string;
  opponent_id?: string;
  opponent_name?: string;
  status: 'waiting' | 'ready' | 'in_progress' | 'completed';
  rounds: number;
  created_at: string;
}

export default function JoinClientSupabase() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const battleId = searchParams.get('id');
  
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserName(session.user.email?.split('@')[0] || 'Challenger');
      } else {
        const { data } = await supabase.auth.signInAnonymously();
        if (data.user) {
          setUserId(data.user.id);
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchBattle = async () => {
      if (!battleId) {
        setError('No battle ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Battle not found');
        } else {
          setBattleData(data as BattleData);
        }
      } catch (err) {
        console.error('Error fetching battle:', err);
        setError('Failed to load battle');
      } finally {
        setLoading(false);
      }
    };

    fetchBattle();
  }, [battleId]);

  const handleJoinBattle = async () => {
    if (!battleData || !userId || !userName.trim()) return;

    setJoining(true);
    try {
      const { error: updateError } = await supabase
        .from('battles')
        .update({
          opponent_id: userId,
          opponent_name: userName.trim(),
          status: 'ready'
        })
        .eq('id', battleData.id)
        .eq('status', 'waiting');

      if (updateError) throw updateError;
      router.push(`/battle/room?id=${battleData.id}`);
    } catch (err) {
      console.error('Error joining battle:', err);
      setError('Failed to join battle. It may have already started.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
        <div className="bg-black/50 rounded-xl p-8 max-w-md w-full text-center border border-red-500">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-white mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="bg-gradient-to-r from-purple-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (battleData?.status !== 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
        <div className="bg-black/50 rounded-xl p-8 max-w-md w-full text-center border border-yellow-500">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Battle Unavailable</h2>
          <p className="text-white mb-6">This battle is no longer accepting challengers.</p>
          <button onClick={() => router.push('/')} className="bg-gradient-to-r from-purple-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold">
            Find Another Battle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
      <div className="bg-black/50 rounded-xl p-8 max-w-md w-full border border-purple-500">
        <h1 className="text-3xl font-bold text-center mb-6">
          <span className="bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
            🎤 Join Battle
          </span>
        </h1>
        
        <div className="bg-gradient-to-r from-purple-800/50 to-red-800/50 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">Challenger:</p>
          <p className="text-white font-bold text-xl">{battleData?.creator_name}</p>
          <p className="text-gray-400 text-sm mt-2">{battleData?.rounds} Round{battleData?.rounds !== 1 ? 's' : ''} Battle</p>
        </div>

        <div className="mb-6">
          <label htmlFor="userName" className="block text-white font-semibold mb-2">Your Battle Name</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            maxLength={20}
          />
        </div>

        <button
          onClick={handleJoinBattle}
          disabled={joining || !userName.trim()}
          className={`w-full py-4 rounded-lg font-bold text-xl transition-all ${
            joining || !userName.trim()
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500'
          }`}
        >
          {joining ? 'Joining...' : '⚔️ Enter the Arena'}
        </button>
      </div>
    </div>
  );
}