'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mic2, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/lib/store'

export default function SignupPage() {
  const router = useRouter()
  const { setUser } = useUserStore()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate username
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters')
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores')
      }

      // Sign up
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      })

      if (authError) throw authError

      if (data.user) {
        // Poll for profile creation with retries (handles trigger delay)
        let profile = null
        const maxRetries = 10
        const retryDelay = 500 // 500ms between retries

        for (let i = 0; i < maxRetries; i++) {
          const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (fetchedProfile) {
            profile = fetchedProfile
            break
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }

        if (profile) {
          setUser(profile)
          router.push('/dashboard')
        } else {
          // Profile still not created after retries, create manually
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username: username,
            }, { onConflict: 'id' })
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            throw new Error('Failed to create profile. Please try logging in.')
          }

          if (newProfile) {
            setUser(newProfile)
            router.push('/dashboard')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-ice-900/10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="card">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-fire-500 to-fire-600 rounded-xl flex items-center justify-center">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-display tracking-wider">
              <span className="gradient-text-fire">RAP BATTLE</span>
            </h1>
          </div>

          <h2 className="text-xl font-bold text-center mb-6">Create Account</h2>

          {error && (
            <div className="bg-fire-500/10 border border-fire-500/30 text-fire-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Stage Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="MC_Awesome"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">3-20 characters, letters, numbers, underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-fire w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400">
              Already have an account?{' '}
              <Link href="/login" className="text-fire-400 hover:text-fire-300">
                Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
