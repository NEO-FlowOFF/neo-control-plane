import {
  Settings,
  Trophy,
  TrendingUp,
  Zap,
  ChevronRight
} from 'lucide-react'
import { Card } from '../components/Card'
import { motion } from 'framer-motion'
import juliaAvatar from '../assets/members/julia_mendes.jpg'

const SELLERS = [
  {
    id: '1',
    name: 'Julia Mendes JTT',
    shopId: '7494482913353827703',
    avatar: juliaAvatar,
    status: 'ACTIVE',
    rank: 1,
    volume: 'R$ 12.450',
    performance: 98,
    growth: '+14%',
    affiliates: 124,
    lastSync: 'Live API'
  }
]

export default function Ranking() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header Ranking */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-acqua-500">
            <Trophy size={18} fill="currentColor" strokeWidth={3} className="animate-bounce" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">NEØ TikTok Shop Connector</span>
          </div>
          <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
            Rancking Sellers
          </h3>
          <p className="text-xs text-gray-500 font-bold tracking-tight opacity-70">Top Performance TikTok Shop Network</p>
        </div>
        
        <button className="w-full md:w-auto px-8 py-4 bg-gradient-to-tr from-acqua-600 to-acqua-400 hover:from-acqua-500 hover:to-acqua-300 text-white rounded-[24px] text-xs font-black transition-all shadow-2xl shadow-acqua-500/20 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest">
          <Zap size={14} fill="currentColor" />
          Add Store
        </button>
      </div>

      {/* Sellers List */}
      <div className="grid grid-cols-1 gap-4">
        {SELLERS.map((seller) => (
          <Card 
            key={seller.id} 
            variant="glass" 
            className="overflow-hidden border-white/[0.05] hover:bg-white/[0.04] transition-all duration-500 group"
          >
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
              
              {/* Rank & Profile */}
              <div className="flex items-center gap-5 w-full md:w-72 shrink-0">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-xl font-black italic tracking-tighter text-white shadow-2xl transition-all group-hover:scale-110 group-hover:border-acqua-500/50 overflow-hidden">
                    {seller.avatar ? (
                      <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                    ) : (
                      seller.rank < 10 ? `0${seller.rank}` : seller.rank
                    )}
                  </div>
                  {seller.rank === 1 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Trophy size={12} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-white italic tracking-tighter truncate">{seller.name}</h4>
                  </div>
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">{seller.shopId.slice(0, 12)}...</p>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 md:px-6 md:border-x border-white/5">
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1">Volume</p>
                  <p className="text-lg font-black text-white italic">{seller.volume}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1">Score</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/[0.05]">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-acqua-600 to-acqua-400" 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${seller.performance}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-400">{seller.performance}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1">Trending</p>
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-black">{seller.growth}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1">Affiliates</p>
                  <p className="text-lg font-black text-white italic">{seller.affiliates}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-40">
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                   <span className="text-[9px] font-black text-emerald-500 uppercase">Active</span>
                </div>
                <button className="w-10 h-10 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:border-acqua-500/30 hover:bg-acqua-500/5 transition-all">
                  <Settings size={18} />
                </button>
                <button className="w-10 h-10 bg-gray-950 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>

            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
