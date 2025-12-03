'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface BattleData {
  id: string;
  host_id: string;
  host_name: string;
  status: string;
  battle_code: string;
  created_at: string;
  participants: string[];
}

export default function JoinBattleClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [joining, setJoining] = useState(false);
  const [userName, setUserName] = useState('');

  const battleCode = searchParams?.get('code');

  useEffect(() => {
    if (!battleCode) {
      setError('No battle code provided');
      setLoading(false);
      return;
    }

    const fetchBattle = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('battles')
          .select('*')
          .eq('battle_code', battleCode)
          .single();

        if (fetchError) {
          setError('Battle not found');
          return;
        }

        if (data.status !== 'waiting') {
          setError('This battle has already started or ended');
          return;
        }

        setBattle(data);
      } catch (err) {
        setError('Error loading battle');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBattle();
  }, [battleCode]);

  const handleJoin = async () => {
    if (!battle || !userName.trim()) return;
    
    setJoining(true);
    try {
      const updatedParticipants = [...(battle.participants || []), userName.trim()];
      
      const { error: updateError } = await supabase
        .from('battles')
        .update({ 
          participants: updatedParticipants,
          status: updatedParticipants.length >= 2 ? 'ready' : 'waiting'
        })
        .eq('id', battle.id);

      if (updateError) {
        setError('Failed to join battle');
        return;
      }

      router.push(`/battle/${battle.id}?name=${encodeURIComponent(userName.trim())}`);
    } catch (err) {
      setError('Error joining battle');
      console.error(err);
    } finally {
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
        <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-red-500/30">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-purple-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-red-700 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Battle</h1>
          <p className="text-gray-400">Battle Code: <span className="text-yellow-400 font-mono">{battleCode}</span></p>
        </div>

        {battle && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-gray-300">
              <span className="text-purple-400">Host:</span> {battle.host_name}
            </p>
            <p className="text-gray-300">
              <span className="text-purple-400">Status:</span> {battle.status}
            </p>
            <p className="text-gray-300">
              <span className="text-purple-400">Participants:</span> {(battle.participants || []).length}/2
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Your Stage Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your rapper name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              maxLength={20}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={joining || !userName.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? 'Joining...' : '🎤 Join Battle'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-white/10 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
