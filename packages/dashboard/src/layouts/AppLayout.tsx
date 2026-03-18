import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import logo from '../assets/flowoff_logo.webp'

interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()

  const navItems = [
    { label: 'Monitor', path: '/', icon: LayoutDashboard },
    { label: 'Ranking', path: '/ranking', icon: Users },
    { label: 'Agência', path: '/agency', icon: Briefcase },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-950 font-sans text-gray-100 overflow-hidden relative">
      {/* Background Neon Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-acqua-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-blue-600/5 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-acqua-950/20 rounded-full blur-[150px]"></div>
      </div>

      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-72 border-r border-white/[0.05] flex-col pt-10 bg-black/40 backdrop-blur-3xl shrink-0 z-10">
        <div className="px-8 mb-12 flex items-start gap-4">
          <div className="mt-1">
            <img src={logo} alt="FlowOFF Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="pt-1">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">NEØ TikTok Shop<br />Connector</h1>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-[22px] transition-all duration-500 group relative",
                  isActive
                    ? "bg-acqua-500/10 text-acqua-400 border border-acqua-500/20 shadow-[0_0_20px_rgba(20,184,166,0.05)]"
                    : "text-gray-500 hover:bg-white/[0.03] hover:text-gray-300 border border-transparent"
                )}
              >
                <item.icon size={22} className={cn("transition-all duration-500", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" : "group-hover:scale-110 opacity-70")} />
                <span className="font-black text-sm tracking-tight uppercase">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-6 bg-acqua-500 rounded-r-full"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Desktop */}
        <div className="p-6">
          <div className="p-5 bg-white/[0.02] rounded-[32px] border border-white/[0.05] flex items-center gap-4 hover:bg-white/[0.05] transition-all cursor-pointer group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-black shadow-2xl">
              FO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate group-hover:text-flowoff-400 transition-colors">Admin Pro</p>
              <p className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase font-bold opacity-60">Master Node</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Header - Mobile Only (Compact) */}
      <header className="md:hidden h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <img src={logo} alt="FlowOFF Logo" className="w-6 h-6 object-contain" />
          <h1 className="text-xs font-black text-white italic tracking-tighter uppercase whitespace-normal leading-tight">
            <span className="text-pink-500">NEØ</span> <span className="text-acqua-500">TikTok Shop</span> <span className="text-gray-500">Connector</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pb-24 md:pb-8 z-10">
        {/* Desktop Header Content (Standalone) */}
        <header className="hidden md:flex h-20 border-b border-white/5 px-10 items-center justify-end sticky top-0 bg-gray-950/80 backdrop-blur-md z-10 gap-6">
          <div className="flex items-center gap-2.5 px-5 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Engine Latency: 42ms</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-acqua-500/50 transition-all cursor-pointer shadow-2xl">
            <UserCircle size={26} />
          </div>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile Only (iOS Style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/60 backdrop-blur-2xl border-t border-white/5 px-8 flex items-center justify-around z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300 relative",
                isActive ? "text-acqua-500" : "text-gray-500"
              )}
            >
              <item.icon size={26} className={cn("transition-transform", isActive && "scale-110 drop-shadow-[0_0_10px_rgba(20,184,166,0.4)]")} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileActive"
                  className="absolute -top-1 w-6 h-0.5 bg-acqua-500 rounded-full"
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
