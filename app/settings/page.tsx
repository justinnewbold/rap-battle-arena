'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Settings, ArrowLeft, Volume2, Bell,
  Shield, User, LogOut, Trash2, Save
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, getUserSettings, updateUserSettings, UserSettings } from '@/lib/supabase'
import { useSounds } from '@/lib/sounds'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isDemo, logout } = useUserStore()
  const sounds = useSounds()

  const [_settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local state for settings
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.7)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationsFriendRequests, setNotificationsFriendRequests] = useState(true)
  const [notificationsBattleInvites, setNotificationsBattleInvites] = useState(true)
  const [notificationsTournamentUpdates, setNotificationsTournamentUpdates] = useState(true)
  const [privacyShowOnlineStatus, setPrivacyShowOnlineStatus] = useState(true)
  const [privacyAllowFriendRequests, setPrivacyAllowFriendRequests] = useState(true)
  const [privacyShowBattleHistory, setPrivacyShowBattleHistory] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadSettings()
  }, [user, router])

  async function loadSettings() {
    setLoading(true)
    if (isDemo) {
      // Demo defaults
      setLoading(false)
      return
    }

    const data = await getUserSettings(user!.id)
    if (data) {
      setSettings(data)
      setSoundEnabled(data.sound_enabled)
      setSoundVolume(data.sound_volume)
      setNotificationsEnabled(data.notifications_enabled)
      setNotificationsFriendRequests(data.notifications_friend_requests)
      setNotificationsBattleInvites(data.notifications_battle_invites)
      setNotificationsTournamentUpdates(data.notifications_tournament_updates)
      setPrivacyShowOnlineStatus(data.privacy_show_online_status)
      setPrivacyAllowFriendRequests(data.privacy_allow_friend_requests)
      setPrivacyShowBattleHistory(data.privacy_show_battle_history)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)

    // Update sound manager
    sounds.setEnabled(soundEnabled)
    sounds.setVolume(soundVolume)

    if (!isDemo && user) {
      await updateUserSettings(user.id, {
        sound_enabled: soundEnabled,
        sound_volume: soundVolume,
        notifications_enabled: notificationsEnabled,
        notifications_friend_requests: notificationsFriendRequests,
        notifications_battle_invites: notificationsBattleInvites,
        notifications_tournament_updates: notificationsTournamentUpdates,
        privacy_show_online_status: privacyShowOnlineStatus,
        privacy_allow_friend_requests: privacyAllowFriendRequests,
        privacy_show_battle_history: privacyShowBattleHistory,
      })
    }

    sounds.play('notification')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    if (!isDemo) {
      await supabase.auth.signOut()
    }
    logout()
    router.push('/')
  }

  function handleVolumeChange(value: number) {
    setSoundVolume(value)
    sounds.setVolume(value)
    // Play a test sound
    sounds.play('button_click')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-dark-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="w-8 h-8 text-dark-400" />
                Settings
              </h1>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "btn-fire flex items-center gap-2",
              saved && "bg-green-500"
            )}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>
                <Save className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sound Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-fire-400" />
                Sound
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sound Effects</p>
                    <p className="text-sm text-dark-400">Play sounds during battles</p>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-colors relative",
                      soundEnabled ? 'bg-fire-500' : 'bg-dark-600'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                      soundEnabled ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                {soundEnabled && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">Volume</p>
                      <span className="text-dark-400">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={soundVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-fire-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gold-400" />
                Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-dark-400">Receive in-app notifications</p>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-colors relative",
                      notificationsEnabled ? 'bg-gold-500' : 'bg-dark-600'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                      notificationsEnabled ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                {notificationsEnabled && (
                  <>
                    <div className="flex items-center justify-between pl-4 border-l-2 border-dark-700">
                      <p className="text-dark-300">Friend Requests</p>
                      <button
                        onClick={() => setNotificationsFriendRequests(!notificationsFriendRequests)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          notificationsFriendRequests ? 'bg-gold-500' : 'bg-dark-600'
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          notificationsFriendRequests ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pl-4 border-l-2 border-dark-700">
                      <p className="text-dark-300">Battle Invites</p>
                      <button
                        onClick={() => setNotificationsBattleInvites(!notificationsBattleInvites)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          notificationsBattleInvites ? 'bg-gold-500' : 'bg-dark-600'
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          notificationsBattleInvites ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pl-4 border-l-2 border-dark-700">
                      <p className="text-dark-300">Tournament Updates</p>
                      <button
                        onClick={() => setNotificationsTournamentUpdates(!notificationsTournamentUpdates)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          notificationsTournamentUpdates ? 'bg-gold-500' : 'bg-dark-600'
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          notificationsTournamentUpdates ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Privacy Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-ice-400" />
                Privacy
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Online Status</p>
                    <p className="text-sm text-dark-400">Let friends see when you're online</p>
                  </div>
                  <button
                    onClick={() => setPrivacyShowOnlineStatus(!privacyShowOnlineStatus)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-colors relative",
                      privacyShowOnlineStatus ? 'bg-ice-500' : 'bg-dark-600'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                      privacyShowOnlineStatus ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow Friend Requests</p>
                    <p className="text-sm text-dark-400">Let others send you friend requests</p>
                  </div>
                  <button
                    onClick={() => setPrivacyAllowFriendRequests(!privacyAllowFriendRequests)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-colors relative",
                      privacyAllowFriendRequests ? 'bg-ice-500' : 'bg-dark-600'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                      privacyAllowFriendRequests ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Public Battle History</p>
                    <p className="text-sm text-dark-400">Let others see your battle history</p>
                  </div>
                  <button
                    onClick={() => setPrivacyShowBattleHistory(!privacyShowBattleHistory)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-colors relative",
                      privacyShowBattleHistory ? 'bg-ice-500' : 'bg-dark-600'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                      privacyShowBattleHistory ? 'right-1' : 'left-1'
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Account Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Account
              </h2>

              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full p-4 bg-dark-700 hover:bg-dark-600 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-dark-400" />
                  <span>Log Out</span>
                </button>

                <button
                  className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 transition-colors text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
