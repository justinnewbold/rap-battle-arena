'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface BattleData {
  hostName: string;
  status: string;
  participants: string[];
  maxParticipants: number;
  topic?: string;
  rounds: number;
}

export default function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const battleId = searchParams.get('id');
  
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchBattle() {
      if (!battleId) {
        setError('No battle ID provided');
        setLoading(false);
        return;
      }

      try {
        const battleRef = doc(db, 'battles', battleId);
        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) {
          setError('Battle not found');
          setLoading(false);
          return;
        }

        const data = battleSnap.data() as BattleData;
        setBattleData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching battle:', err);
        setError('Failed to load battle');
        setLoading(false);
      }
    }

    fetchBattle();
  }, [battleId]);

  const handleJoinBattle = async () => {
    if (!user || !battleId || !battleData) return;

    setJoining(true);
    try {
      const battleRef = doc(db, 'battles', battleId);
      await updateDoc(battleRef, {
        participants: arrayUnion(user.uid),
        participantNames: arrayUnion(user.displayName || user.email || 'Anonymous')
      });
      
      router.push(`/battle/${battleId}`);
    } catch (err) {
      console.error('Error joining battle:', err);
      setError('Failed to join battle');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center">
        <div className="bg-black/50 p-8 rounded-xl border-2 border-red-500 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold hover:scale-105 transition-transform"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!battleData) {
    return null;
  }

  const isFull = battleData.participants.length >= battleData.maxParticipants;
  const isAlreadyJoined = user && battleData.participants.includes(user.uid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-lg p-8 rounded-2xl border-2 border-yellow-400 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          🎤 Join Rap Battle
        </h1>

        <div className="space-y-4 mb-8">
          <div className="bg-white/10 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Host</p>
            <p className="text-white font-bold text-lg">{battleData.hostName}</p>
          </div>

          {battleData.topic && (
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Topic</p>
              <p className="text-white font-bold text-lg">{battleData.topic}</p>
            </div>
          )}

          <div className="bg-white/10 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Rounds</p>
            <p className="text-white font-bold text-lg">{battleData.rounds}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Participants</p>
            <p className="text-white font-bold text-lg">
              {battleData.participants.length} / {battleData.maxParticipants}
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Status</p>
            <p className={`font-bold text-lg ${
              battleData.status === 'waiting' ? 'text-green-400' : 
              battleData.status === 'in_progress' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {battleData.status === 'waiting' ? '🟢 Waiting for players' : 
               battleData.status === 'in_progress' ? '🟡 In Progress' : '🔴 Ended'}
            </p>
          </div>
        </div>

        {!user ? (
          <div className="text-center">
            <p className="text-yellow-400 mb-4">Please sign in to join</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-lg hover:scale-105 transition-transform"
            >
              Sign In
            </button>
          </div>
        ) : isAlreadyJoined ? (
          <button
            onClick={() => router.push(`/battle/${battleId}`)}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold text-lg hover:scale-105 transition-transform"
          >
            ✅ Already Joined - Enter Battle
          </button>
        ) : isFull ? (
          <button
            disabled
            className="w-full py-4 bg-gray-600 rounded-xl text-gray-400 font-bold text-lg cursor-not-allowed"
          >
            Battle is Full
          </button>
        ) : battleData.status !== 'waiting' ? (
          <button
            disabled
            className="w-full py-4 bg-gray-600 rounded-xl text-gray-400 font-bold text-lg cursor-not-allowed"
          >
            Battle Already Started
          </button>
        ) : (
          <button
            onClick={handleJoinBattle}
            disabled={joining}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-black font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? 'Joining...' : '🎤 Join Battle!'}
          </button>
        )}
      </div>
    </div>
  );
}