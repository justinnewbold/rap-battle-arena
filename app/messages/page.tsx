'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, ArrowLeft, Send, Search, X, Check, CheckCheck,
  User, Loader2, Swords
} from 'lucide-react'
import { useUserStore, usePresenceStore } from '@/lib/store'
import {
  Profile, Message, Conversation,
  getConversations, getConversation, sendMessage,
  markMessagesAsRead, searchUsers, supabase, getProfile
} from '@/lib/supabase'
import { getAvatarUrl, cn, formatElo, getEloRank } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'
import { usePresence } from '@/lib/hooks/usePresence'

// Demo data
const DEMO_CONVERSATIONS: Conversation[] = [
  {
    user: { id: 'f1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1450, wins: 28, losses: 12, total_battles: 40, created_at: '', updated_at: '' },
    lastMessage: { id: 'm1', sender_id: 'f1', receiver_id: 'demo', content: 'GG! That last round was fire', read: false, created_at: new Date(Date.now() - 300000).toISOString() },
    unreadCount: 1
  },
  {
    user: { id: 'f2', username: 'LyricQueen', avatar_url: null, elo_rating: 1380, wins: 22, losses: 15, total_battles: 37, created_at: '', updated_at: '' },
    lastMessage: { id: 'm2', sender_id: 'demo', receiver_id: 'f2', content: 'Ready for a rematch?', read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
    unreadCount: 0
  },
  {
    user: { id: 'f3', username: 'BeatMaster', avatar_url: null, elo_rating: 1520, wins: 35, losses: 10, total_battles: 45, created_at: '', updated_at: '' },
    lastMessage: { id: 'm3', sender_id: 'f3', receiver_id: 'demo', content: 'Check out my new beat, its crazy!', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    unreadCount: 0
  },
]

const DEMO_MESSAGES: Message[] = [
  { id: 'd1', sender_id: 'f1', receiver_id: 'demo', content: 'Yo, nice bars in that last battle!', read: true, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'd2', sender_id: 'demo', receiver_id: 'f1', content: 'Thanks! Your flow was on point too', read: true, created_at: new Date(Date.now() - 500000).toISOString() },
  { id: 'd3', sender_id: 'f1', receiver_id: 'demo', content: 'We should run it back sometime', read: true, created_at: new Date(Date.now() - 400000).toISOString() },
  { id: 'd4', sender_id: 'demo', receiver_id: 'f1', content: "I'm down! Just hit me up when you're ready", read: true, created_at: new Date(Date.now() - 350000).toISOString() },
  { id: 'd5', sender_id: 'f1', receiver_id: 'demo', content: 'GG! That last round was fire', read: false, created_at: new Date(Date.now() - 300000).toISOString() },
]

function MessagesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()
  const { isUserOnline } = usePresenceStore()
  const sounds = useSounds()

  usePresence()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check for user param in URL to open chat directly
  useEffect(() => {
    const targetUserId = searchParams.get('user')
    if (targetUserId && user) {
      loadUserAndOpenChat(targetUserId)
    }
  }, [searchParams, user])

  async function loadUserAndOpenChat(userId: string) {
    if (isDemo) {
      const demoUser = DEMO_CONVERSATIONS.find(c => c.user.id === userId)?.user
      if (demoUser) {
        setSelectedUser(demoUser)
        loadMessages(demoUser.id)
      }
    } else {
      const profile = await getProfile(userId)
      if (profile) {
        setSelectedUser(profile)
        loadMessages(profile.id)
      }
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadConversations()
  }, [user, router])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time message subscription
  useEffect(() => {
    if (!user || !selectedUser || isDemo) return

    const channel = supabase
      .channel(`messages-${user.id}-${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          if (newMsg.sender_id !== user.id) {
            sounds.play('notification')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, selectedUser, isDemo, sounds])

  async function loadConversations() {
    setLoading(true)
    if (isDemo) {
      setConversations(DEMO_CONVERSATIONS)
    } else {
      const data = await getConversations(user!.id)
      setConversations(data)
    }
    setLoading(false)
  }

  async function loadMessages(otherUserId: string) {
    if (isDemo) {
      setMessages(DEMO_MESSAGES)
      return
    }

    const msgs = await getConversation(user!.id, otherUserId)
    setMessages(msgs)

    // Mark messages as read
    await markMessagesAsRead(user!.id, otherUserId)

    // Update conversation unread count locally
    setConversations(prev => prev.map(c =>
      c.user.id === otherUserId ? { ...c, unreadCount: 0 } : c
    ))
  }

  async function handleSelectConversation(conv: Conversation) {
    setSelectedUser(conv.user)
    loadMessages(conv.user.id)
    inputRef.current?.focus()
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedUser || !user) return

    setSendingMessage(true)
    const content = newMessage.trim()
    setNewMessage('')

    if (isDemo) {
      // Demo mode - just add to local state
      const demoMsg: Message = {
        id: `demo-${Date.now()}`,
        sender_id: user.id,
        receiver_id: selectedUser.id,
        content,
        read: false,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, demoMsg])
      sounds.play('button_click')
      setSendingMessage(false)
      return
    }

    const msg = await sendMessage(user.id, selectedUser.id, content)
    if (msg) {
      // Message added via real-time subscription
      sounds.play('button_click')

      // Update conversation list
      setConversations(prev => {
        const existing = prev.find(c => c.user.id === selectedUser.id)
        if (existing) {
          return prev.map(c =>
            c.user.id === selectedUser.id
              ? { ...c, lastMessage: msg }
              : c
          )
        } else {
          return [{ user: selectedUser, lastMessage: msg, unreadCount: 0 }, ...prev]
        }
      })
    }
    setSendingMessage(false)
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    if (isDemo) {
      // Filter from demo conversations
      const results = DEMO_CONVERSATIONS
        .map(c => c.user)
        .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
      setSearchResults(results)
    } else {
      const results = await searchUsers(searchQuery)
      setSearchResults(results.filter(r => r.id !== user!.id))
    }
    setSearching(false)
  }, [searchQuery, isDemo, user])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  function handleStartChat(profile: Profile) {
    setSelectedUser(profile)
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
    loadMessages(profile.id)
    inputRef.current?.focus()
  }

  function handleChallenge() {
    if (!selectedUser) return
    sounds.play('button_click')
    router.push(`/battle/create?challenge=${selectedUser.id}`)
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (diff < 604800000) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function isOnline(userId: string): boolean {
    if (isDemo) return userId === 'f1' // MC_Thunder is online in demo
    return isUserOnline(userId)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar - Conversation List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-dark-800 flex flex-col",
        selectedUser && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-dark-400 hover:text-white md:hidden"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Messages
              </h1>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-400 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : conversations.length > 0 ? (
            <div>
              {conversations.map((conv) => (
                <div
                  key={conv.user.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer transition-colors",
                    selectedUser?.id === conv.user.id
                      ? "bg-purple-500/20"
                      : "hover:bg-dark-800"
                  )}
                >
                  <div className="relative">
                    <img
                      src={getAvatarUrl(conv.user.username, conv.user.avatar_url)}
                      alt={conv.user.username}
                      className="w-12 h-12 rounded-full"
                    />
                    {isOnline(conv.user.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-950" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{conv.user.username}</p>
                      <span className="text-xs text-dark-500">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        conv.unreadCount > 0 ? "text-white font-medium" : "text-dark-400"
                      )}>
                        {conv.lastMessage.sender_id === user.id && (
                          <span className="text-dark-500">You: </span>
                        )}
                        {conv.lastMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 w-5 h-5 bg-purple-500 rounded-full text-xs flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-dark-600" />
              <h3 className="font-bold mb-2">No Messages Yet</h3>
              <p className="text-dark-400 text-sm mb-4">Start a conversation with a friend or opponent</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-purple"
              >
                Start Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedUser && "hidden md:flex"
      )}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-dark-800 flex items-center gap-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="text-dark-400 hover:text-white md:hidden"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => router.push(`/profile/${selectedUser.id}`)}
              >
                <div className="relative">
                  <img
                    src={getAvatarUrl(selectedUser.username, selectedUser.avatar_url)}
                    alt={selectedUser.username}
                    className="w-10 h-10 rounded-full"
                  />
                  {isOnline(selectedUser.id) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-dark-950" />
                  )}
                </div>
                <div>
                  <p className="font-bold">{selectedUser.username}</p>
                  <p className="text-xs text-dark-400">
                    {isOnline(selectedUser.id) ? (
                      <span className="text-green-400">Online</span>
                    ) : (
                      `${formatElo(selectedUser.elo_rating)} ELO`
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleChallenge}
                className="btn-fire flex items-center gap-2"
              >
                <Swords className="w-4 h-4" />
                <span className="hidden sm:inline">Challenge</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user.id
                const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== msg.sender_id)

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-end gap-2",
                      isOwn && "flex-row-reverse"
                    )}
                  >
                    {showAvatar ? (
                      <img
                        src={getAvatarUrl(selectedUser.username, selectedUser.avatar_url)}
                        alt={selectedUser.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8" />
                    )}
                    <div className={cn(
                      "max-w-[70%] px-4 py-2 rounded-2xl",
                      isOwn
                        ? "bg-purple-500 rounded-br-sm"
                        : "bg-dark-800 rounded-bl-sm"
                    )}>
                      <p className="text-sm break-words">{msg.content}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isOwn && "justify-end"
                      )}>
                        <span className="text-xs text-dark-400">
                          {formatTime(msg.created_at)}
                        </span>
                        {isOwn && (
                          msg.read ? (
                            <CheckCheck className="w-3 h-3 text-purple-300" />
                          ) : (
                            <Check className="w-3 h-3 text-dark-400" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-dark-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input flex-1"
                  maxLength={1000}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    newMessage.trim()
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : "bg-dark-800 text-dark-500"
                  )}
                >
                  {sendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 text-dark-700" />
              <h3 className="text-xl font-bold mb-2">Select a Conversation</h3>
              <p className="text-dark-400">Choose a chat from the list or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 pt-20"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-900 rounded-2xl w-full max-w-md border border-dark-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                <h3 className="font-bold text-lg">New Message</h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-2 hover:bg-dark-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="input pl-12 w-full"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((profile) => {
                        const rank = getEloRank(profile.elo_rating)
                        return (
                          <div
                            key={profile.id}
                            onClick={() => handleStartChat(profile)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800 cursor-pointer transition-colors"
                          >
                            <div className="relative">
                              <img
                                src={getAvatarUrl(profile.username, profile.avatar_url)}
                                alt={profile.username}
                                className="w-10 h-10 rounded-full"
                              />
                              {isOnline(profile.id) && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-dark-900" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{profile.username}</p>
                              <p className="text-xs text-dark-400">
                                <span className={rank.color}>{rank.icon}</span>
                                {' '}{formatElo(profile.elo_rating)} ELO
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : searchQuery.length >= 2 && !searching ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 mx-auto mb-2 text-dark-600" />
                      <p className="text-dark-400 text-sm">No users found</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 mx-auto mb-2 text-dark-600" />
                      <p className="text-dark-400 text-sm">Search for a user to message</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  )
}
