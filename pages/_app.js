import '../styles/globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Header() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('user')

  useEffect(() => {
    const init = async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      setSession(data.session || null)
      const roles = data.session?.user?.app_metadata?.roles || []
      const userRole = data.session?.user?.user_metadata?.role
      const eff = roles?.includes?.('admin') || userRole === 'admin' ? 'admin' : (roles?.includes?.('moderator') || userRole === 'moderator' ? 'moderator' : 'user')
      setRole(eff)
    }
    init()
    const { data: sub } = supabase?.auth?.onAuthStateChange((_ev, s) => {
      setSession(s)
      const roles = s?.user?.app_metadata?.roles || []
      const userRole = s?.user?.user_metadata?.role
      const eff = roles?.includes?.('admin') || userRole === 'admin' ? 'admin' : (roles?.includes?.('moderator') || userRole === 'moderator' ? 'moderator' : 'user')
      setRole(eff)
    }) || { data: null }
    return () => sub?.subscription?.unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="w-full bg-[#1e3a5f] text-[#faf6f0] border-b border-[#2c5f6f]">
      <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-bold prophecy-gradient-text">Prophecy.Claims</Link>
        </div>
        <div className="flex items-center justify-center">
          <div className="bg-gradient-to-r from-[#e89547] to-[#f4d03f] text-[#1e3a5f] px-3 py-1 rounded-full text-xs font-semibold shadow">
            <span className="mr-2">🚧</span>
            BETA • Features in active development
            <span className="ml-2">🚧</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4">
          <Link href="/timelines" className="hover:text-[#d4a574]">Timelines</Link>
          {!session && <Link href="/login" className="prophecy-button-sm px-3 py-1 text-sm">Login</Link>}
          {session && (
            <>
              <Link href="/dashboard" className="prophecy-button-sm px-3 py-1 text-sm">Dashboard</Link>
              <span className="text-xs opacity-80">{role}</span>
              <button onClick={handleLogout} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm hover:bg-white/20">Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Header />
      <Component {...pageProps} />
    </>
  )
}
