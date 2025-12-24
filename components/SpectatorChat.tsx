'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import { supabase, ChatMessage, sendChatMessage, getChatMessages } from '@/lib/supabase'
import { getAvatarUrl, cn } from '@/lib/utils'

interface SpectatorChatProps {
  battleId: string
  userId: string
  username: string
  isDemo?: boolean
}

export default function SpectatorChat({ battleId, userId, username, isDemo }: SpectatorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Refs to hold current values for use in subscription callback
  const isMinimizedRef = useRef(isMinimized)
  const userIdRef = useRef(userId)

  // Keep refs in sync with state
  useEffect(() => {
    isMinimizedRef.current = isMinimized
  }, [isMinimized])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    if (isDemo) {
      // Demo messages
      setMessages([
        {
          id: '1',
          battle_id: battleId,
          user_id: 'demo-user-1',
          message: 'This is gonna be fire! 🔥',
          created_at: new Date(Date.now() - 30000).toISOString(),
          user: { id: 'demo-user-1', username: 'HipHopHead', avatar_url: null }
        },
        {
          id: '2',
          battle_id: battleId,
          user_id: 'demo-user-2',
          message: 'MC_Fire always brings the heat',
          created_at: new Date(Date.now() - 20000).toISOString(),
          user: { id: 'demo-user-2', username: 'BeatDropper', avatar_url: null }
        },
        {
          id: '3',
          battle_id: battleId,
          user_id: 'demo-user-3',
          message: 'Idk MC_Ice has been practicing',
          created_at: new Date(Date.now() - 10000).toISOString(),
          user: { id: 'demo-user-3', username: 'RhymeTime', avatar_url: null }
        },
      ])
      return
    }

    // Load initial messages
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_chat',
          filter: `battle_id=eq.${battleId}`
        },
        async (payload) => {
          try {
            // Fetch the full message with user data
            const { data, error } = await supabase
              .from('battle_chat')
              .select(`
                *,
                user:profiles(id, username, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error('Error fetching chat message:', error)
              return
            }

            if (data) {
              setMessages(prev => [...prev, data])
              // Use refs to get current values in callback
              if (isMinimizedRef.current && data.user_id !== userIdRef.current) {
                setUnreadCount(prev => prev + 1)
              }
            }
          } catch (err) {
            console.error('Error in chat subscription callback:', err)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [battleId, isDemo])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isMinimized) {
      setUnreadCount(0)
    }
  }, [isMinimized])

  async function loadMessages() {
    const data = await getChatMessages(battleId)
    setMessages(data)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage('')

    if (isDemo) {
      // Add demo message locally
      const demoMessage: ChatMessage = {
        id: `demo-${Date.now()}`,
        battle_id: battleId,
        user_id: userId,
        message: messageText,
        created_at: new Date().toISOString(),
        user: { id: userId, username, avatar_url: null }
      }
      setMessages(prev => [...prev, demoMessage])
      return
    }

    await sendChatMessage(battleId, userId, messageText)
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-400 transition-colors z-50"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-fire-500 rounded-full text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden",
        isMinimized ? "w-72 h-14" : "w-80 h-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-dark-800 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Live Chat</span>
          {unreadCount > 0 && isMinimized && (
            <span className="px-2 py-0.5 bg-fire-500 rounded-full text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-dark-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-dark-400" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-dark-400" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-dark-400 text-sm py-8">
                No messages yet. Be the first to chat!
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg) => {
                  const isOwnMessage = msg.user_id === userId
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2",
                        isOwnMessage && "flex-row-reverse"
                      )}
                    >
                      <img
                        src={getAvatarUrl(msg.user?.username || 'User', msg.user?.avatar_url)}
                        alt={msg.user?.username || 'User'}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div className={cn(
                        "max-w-[70%]",
                        isOwnMessage && "text-right"
                      )}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn(
                            "text-xs font-medium",
                            isOwnMessage ? "text-purple-400" : "text-dark-400"
                          )}>
                            {msg.user?.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-dark-500">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <div className={cn(
                          "rounded-xl px-3 py-2 text-sm inline-block",
                          isOwnMessage
                            ? "bg-purple-500/20 text-purple-100"
                            : "bg-dark-700 text-white"
                        )}>
                          {msg.message}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-dark-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Say something..."
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-purple-500 rounded-lg hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </motion.div>
  )
}
