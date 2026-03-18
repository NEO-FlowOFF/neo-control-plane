import {
  Activity,
  AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../components/Card'
import tiktokPartnerBadge from '../assets/tiktok-partner-seller.svg'

export default function Overview() {
  const SELLERS_LIVE = [
    { name: 'Loja Teste Alpha', rating: '4.9', itemsSold: '12k+', joined: '10 min ago' },
    { name: 'Beta Store BR', rating: '5.0', itemsSold: '8k+', joined: '25 min ago' },
    { name: 'Charlie Imports', rating: '4.7', itemsSold: '3k+', joined: '1 hr ago' },
  ]

  return (
    <div className="space-y-6">
      {/* Ticker de Notícias (Breaking News) */}
      <div className="w-full bg-gray-900 overflow-hidden rounded-lg flex items-center border border-acqua-500/10">
        <div className="bg-acqua-500 text-gray-950 font-black px-4 py-2 uppercase text-[10px] tracking-widest shrink-0 relative z-10">
          News
        </div>
        <div className="w-full overflow-hidden relative" style={{ height: '32px' }}>
          <motion.div
            className="absolute whitespace-nowrap text-xs font-semibold text-gray-300 py-2"
            animate={{ x: ["100%", "-100%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
          >
            <span className="text-emerald-500 font-bold px-2">●</span> TikTok Shop Brasil alcança US$ 26.2 bi YoY
            <span className="text-emerald-500 font-bold px-2 ml-4">●</span> Isenção de comissão ativa para novos Sellers em Março
            <span className="text-emerald-500 font-bold px-2 ml-4">●</span> 111M de usuários no BR prontos para comprar
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-5 h-auto md:h-[600px]">

        {/* Main Stats Card (Hero) */}
        <Card className="md:col-span-2 md:row-span-2 group relative overflow-hidden p-8 border-white/[0.05] flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 p-5 opacity-5 group-hover:scale-125 transition-all duration-1000 group-hover:opacity-10 text-acqua-500">
            <Activity size={300} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">REAL DIGITAL MARKETPLACE</span>
            </div>
            <h3 className="text-6xl font-black text-white italic tracking-tighter leading-none mb-6">OPEN-FLOW</h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">A Liderança em Sellers do TikTok Shop Brasil</p>
            <button className="bg-acqua-500 hover:bg-acqua-400 text-gray-950 font-black px-6 py-3 rounded-lg text-sm uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(45,212,191,0.2)]">
              Quero Me Cadastrar
            </button>
          </div>
        </Card>

        {/* Urgência Card (Countdown Comissão) */}
        <Card className="md:col-span-2 md:row-span-1 group relative overflow-hidden p-8 border-acqua-500/20 bg-gradient-to-br from-gray-900 to-gray-950">
          <div className="relative z-10 h-full flex flex-col justify-center">
            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertCircle size={12} className="text-pink-500" /> Urgência: Novos Sellers
            </span>
            <h3 className="text-2xl font-black text-white italic tracking-tighter mb-2">ISENÇÃO DE COMISSÃO (60 DIAS)</h3>
            <p className="text-sm text-gray-400">Entre agora e economize até R$ 17.000 em taxas nas missões do oficial do TikTok.</p>
          </div>
        </Card>

        {/* Top Performer // Substituted by Live Onboarded Feed */}
        <Card variant="glass" className="md:col-span-2 md:row-span-1 h-full overflow-hidden p-6 border-white/[0.05]">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Painel Ao Vivo</span>
            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
              <span className="text-[8px] font-black text-emerald-500 uppercase">Live Sincronization</span>
            </div>
          </div>

          <div className="space-y-3">
            {SELLERS_LIVE.map(s => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-white/[0.02] hover:bg-white/[0.01]">
                <span className="font-semibold text-white text-sm truncate">{s.name}</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-400">⭐ {s.rating}</span>
                  <span className="text-gray-400">{s.itemsSold} stats</span>
                  <span className="text-acqua-500 font-medium">{s.joined}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Grid Inferior: Eligibility e Partner Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* FAQ Eligibility */}
        <Card variant="glass" className="md:col-span-2 overflow-hidden p-6 border-white/[0.05]">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Roadmap: Você se qualifica?</h3>
          <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
            <div className="flex items-start gap-2 text-white">
              <span className="text-emerald-500 mt-0.5">✔</span> CNPJ + Licença Brasileira
            </div>
            <div className="flex items-start gap-2 text-white">
              <span className="text-emerald-500 mt-0.5">✔</span> Armazenagem de estoque Local (BR)
            </div>
            <div className="flex items-start gap-2 text-white">
              <span className="text-emerald-500 mt-0.5">✔</span> Sem Alimentos ou Joias (BETA)
            </div>
            <div className="flex items-start gap-2 text-white opacity-60">
              <span className="text-pink-500 mt-0.5">×</span> CPF / Vendedores Pessoa Física
            </div>
          </div>
        </Card>

        {/* Partner Status Card (Bento Small) */}
        <Card variant="glass" className="relative overflow-hidden p-6 border-white/[0.05] flex items-center justify-center hover:bg-white/[0.03] transition-colors">
          <img
            src={tiktokPartnerBadge}
            alt="TikTok Shop Partner"
            className="w-full h-auto max-w-[140px] flex-shrink-0 object-contain opacity-90 group-hover:scale-105 transition-transform duration-500 invert"
          />
        </Card>

      </div>
    </div>
  )
}
