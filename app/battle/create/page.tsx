'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Users, ArrowLeft, Loader2 } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, createBattle, Battle } from '@/lib/supabase'
import { getAvatarUrl, generateRoomCode } from '@/lib/utils'

export default function CreateBattlePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()
  
  const [roomCode, setRoomCode] = useState('')
  const [battle, setBattle] = useState<Battle | null>(null)
  const [copied, setCopied] = useState(false)
  const [waiting, setWaiting] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const code = searchParams.get('code') || generateRoomCode()
    setRoomCode(code)

    if (!isDemo) {
      createRoom(code)
    }
  }, [])

  async function createRoom(code: string) {
    const newBattle = await createBattle(user!.id, code)
    if (newBattle) {
      setBattle(newBattle)
      
      // Subscribe to battle updates
      const channel = supabase
        .channel(`battle-${newBattle.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${newBattle.id}`
          },
          (payload) => {
            if (payload.new.status === 'ready' && payload.new.player2_id) {
              // Someone joined!
              setWaiting(false)
              setTimeout(() => {
                router.push(`/battle/${newBattle.id}`)
              }, 1500)
            }
          }
        )
        .subscribe()
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDemoStart() {
    // In demo mode, just go to a demo battle
    router.push(`/battle/demo-${Date.now()}`)
  }

  function handleCancel() {
    // Delete the battle if we created one
    if (battle) {
      supabase.from('battles').delete().eq('id', battle.id)
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-ice-900/10 via-dark-950 to-fire-900/10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full"
      >
        <button
          onClick={handleCancel}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>

        <div className="card text-center">
          <div className="w-16 h-16 bg-ice-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-ice-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Battle Room Created</h2>
          <p className="text-dark-400 mb-6">Share this code with your opponent</p>

          {/* Room Code Display */}
          <div className="bg-dark-700 rounded-xl p-4 mb-4">
            <div className="text-4xl font-mono font-bold tracking-widest text-ice-400 mb-2">
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Waiting Animation */}
          <div className="py-8">
            {waiting ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <img
                    src={getAvatarUrl(user?.username || '', user?.avatar_url)}
                    alt="You"
                    className="w-12 h-12 rounded-full border-2 border-fire-500"
                  />
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-dark-600 flex items-center justify-center">
                    <span className="text-dark-500">?</span>
                  </div>
                </div>
                <p className="text-dark-400">Waiting for opponent to join...</p>
              </>
            ) : (
              <>
                <div className="text-green-400 font-bold mb-2">Opponent Found!</div>
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                <p className="text-dark-400 mt-2">Starting battle...</p>
              </>
            )}
          </div>

          {/* Demo mode button */}
          {isDemo && (
            <button onClick={handleDemoStart} className="btn-fire w-full">
              Start Demo Battle
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
