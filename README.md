# 🎤 Rap Battle Arena

AI-judged live rap battles with real-time audio streaming. Battle anyone worldwide!

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## 🔥 Features

- **Live Rap Battles** - Record your verses and battle opponents
- **AI Judging** - GPT-4 scores your bars on rhyme, flow, punchlines, and more
- **ELO Rankings** - Competitive rating system
- **Demo Mode** - Try without signing up
- **Real-time Matchmaking** - Find opponents at your skill level

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Auth & Database**: Supabase
- **AI**: OpenAI GPT-4 + Whisper
- **State**: Zustand
- **Hosting**: Vercel

## 📦 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/justinnewbold/rap-battle-arena)

## 🛠️ Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

### 2. Supabase Database

Run the SQL schema in Supabase SQL Editor (see schema in `/supabase` folder).

### 3. Deploy

Push to GitHub and connect to Vercel. Auto-deploys on every push.

## 🎮 How It Works

1. **Sign Up** or use Demo Mode
2. **Quick Match** to find an opponent
3. **Battle** - Take turns rapping (60 seconds each)
4. **AI Judge** scores your verses
5. **Win** to climb the leaderboard!

## 📊 Scoring Categories

| Category | Weight |
|----------|--------|
| Rhyme Complexity | 20% |
| Flow & Rhythm | 25% |
| Punchlines | 20% |
| Delivery | 15% |
| Creativity | 10% |
| Rebuttal | 10% |

## 📁 Project Structure

```
app/
├── page.tsx          # Landing page
├── login/            # Auth pages
├── signup/
├── dashboard/        # Main dashboard
├── matchmaking/      # Find opponents
├── battle/
│   ├── [id]/        # Battle room
│   ├── create/      # Create room
│   └── join/        # Join room
└── api/
    ├── judge/       # AI scoring
    └── transcribe/  # Speech-to-text
lib/
├── supabase.ts      # Database client
├── store.ts         # Zustand stores
└── utils.ts         # Helpers
```

---

Built with 🔥 by Justin @ Patty Shack
