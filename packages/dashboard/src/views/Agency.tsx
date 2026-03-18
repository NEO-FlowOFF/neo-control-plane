import {
  Users,
  BarChart3,
  Layout,
  CheckCircle2,
  UserCircle,
  TrendingUp,
  Activity,
  Briefcase,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { Card } from '../components/Card'
import { cn } from '../lib/utils'
import juliaAvatar from '../assets/members/julia_mendes.jpg'

const AGENCY_MEMBERS = [
  {
    id: 'm1',
    name: 'Julia Mendes JTT',
    subName: '@julia.mendes',
    avatar: juliaAvatar,
    status: 'ACTIVE',
    postsPerDay: 8,
    shops: 3,
    engagement: '14.2%',
    reach: '124K',
    tags: ['Elite', 'TikTok Specialist', 'API Connected']
  }
]

export default function Agency() {
  return (
    <div className="space-y-10 pb-10">
      {/* Header Sala da Agência */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-acqua-500">
            <Briefcase size={18} fill="currentColor" strokeWidth={3} className="animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Agency Headquarters</span>
          </div>
          <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
            Sala de monitoramento
          </h3>
          <p className="text-xs text-gray-500 font-bold tracking-tight opacity-70">Monitoramento Geral de Performance e Postagens</p>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: 'Fluxo Diário', value: '08', icon: Activity },
            { label: 'Membros', value: '01', icon: Users }
          ].map((stat, i) => (
            <div key={i} className="px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl">
              <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-center gap-2">
                <stat.icon size={12} className="text-acqua-500" />
                <span className="text-lg font-black text-white italic">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de Métricas Macro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="glass" className="p-6 border-white/[0.05] relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 opacity-5 group-hover:scale-110 transition-transform">
            <BarChart3 size={120} className="text-acqua-500" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total</p>
          <div className="flex items-end gap-3">
            <h4 className="text-4xl font-black text-white italic tracking-tighter">08</h4>
            <span className="text-[10px] text-emerald-500 font-black mb-1.5">POSTS</span> <span className="text-[8px] text-gray-500 font-black mb-1.5">/DIA</span>
          </div>
        </Card>

        <Card variant="glass" className="p-6 border-white/[0.05] relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 opacity-5 group-hover:scale-110 transition-transform">
            <Layout size={120} className="text-acqua-500" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Lojas Gerenciadas</p>
          <h4 className="text-4xl font-black text-white italic tracking-tighter">03</h4>
        </Card>

        <Card className="p-6 border-white/[0.05] relative overflow-hidden group bg-gradient-to-tr from-acqua-600/20 to-transparent">
          <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={120} className="text-acqua-500" />
          </div>
          <p className="text-[10px] font-black text-acqua-400 uppercase tracking-widest mb-2">Alcance Estimado</p>
          <h4 className="text-4xl font-black text-white italic tracking-tighter">124K</h4>
        </Card>
      </div>

      {/* Lista de Membros - Ficha Técnica Completa */}
      <div className="space-y-4">
        <h3 className="px-1 text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
          <div className="w-1 h-3 bg-acqua-500 rounded-full"></div>
          Ficha Técnica de Membros
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {AGENCY_MEMBERS.map((member) => (
            <Card key={member.id} variant="glass" className="group overflow-hidden border-white/[0.05] hover:bg-white/[0.04] transition-all duration-500 active:scale-[0.99]">
              <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">

                {/* Profile Section */}
                <div className="flex items-center gap-5 w-full md:w-72 shrink-0">
                  <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-acqua-500 relative shadow-2xl overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={32} />
                    )}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-gray-950 flex items-center justify-center shadow-lg",
                      member.status === 'ACTIVE' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-gray-600 shadow-gray-500/20"
                    )}>
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-white italic tracking-tighter truncate">{member.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{member.subName}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {member.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-black text-acqua-500 bg-acqua-500/10 px-2 py-0.5 rounded-full border border-acqua-500/10 uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metrics Section */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 md:px-6 md:border-x border-white/5">
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Postagens / Dia</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xl font-black italic",
                        member.postsPerDay > 0 ? "text-white" : "text-gray-600"
                      )}>{member.postsPerDay}</span>
                      {member.postsPerDay > 0 && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Lojas</p>
                    <p className="text-xl font-black text-gray-300 italic">{member.shops}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Engajamento</p>
                    <p className="text-xl font-black text-gray-300 italic">{member.engagement}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Alcance</p>
                    <p className="text-xl font-black text-gray-300 italic">{member.reach}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-32">
                  <button className="flex-1 md:flex-none w-12 h-12 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center text-gray-500 hover:text-acqua-500 hover:bg-acqua-500/5 transition-all">
                    <ExternalLink size={18} />
                  </button>
                  <button className="flex-1 md:flex-none w-12 h-12 bg-gray-950 border border-white/5 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
                    <ChevronRight size={18} />
                  </button>
                </div>

              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
