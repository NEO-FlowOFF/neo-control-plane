import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Settings,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Shield,
  Activity,
  UserCircle
} from 'lucide-react'

// Mock data for initial presentation
const SELLERS = [
  { id: '1', name: 'Julia Mendes JTT', shopId: '7494482913353827703', status: 'ACTIVE' },
]

const ANNOUNCEMENTS = [
  {
    id: 'a1',
    title: '[TIKTOK] - US market: Updates to mandatory attributes',
    date: '06 Mar 2026',
    category: 'tiktok',
    link: 'https://partner.tiktokshop.com/docv2/page/69aa42cbb326d704fa58f297'
  },
  {
    id: 'a2',
    title: '[TIKTOK] - EU markets: Get Shipping Providers API',
    date: '04 Mar 2026',
    category: 'tiktok',
    link: 'https://partner.tiktokshop.com/docv2/page/69a6adf196796b049fe30fc0'
  }
]

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="flex h-screen bg-gray-950 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col pt-8 bg-gray-900/50 backdrop-blur-xl">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-flowoff-600 rounded-xl flex items-center justify-center shadow-lg shadow-flowoff-500/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">FlowOff</h1>
            <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">Platform</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-flowoff-600/10 text-flowoff-400 border border-flowoff-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sellers' ? 'bg-flowoff-600/10 text-flowoff-400 border border-flowoff-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-medium">Vendedores</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white opacity-50 cursor-not-allowed">
            <Settings size={20} />
            <span className="font-medium">Configurações</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="p-4 bg-gray-800/40 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-flowoff-900 border border-flowoff-700 flex items-center justify-center text-[10px] font-bold">
              FO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Admin FlowOff</p>
              <p className="text-[10px] text-gray-500 truncate">43.376.355/0001-92</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-20 border-b border-gray-800 px-8 flex items-center justify-between sticky top-0 bg-gray-950/80 backdrop-blur-md z-10">
          <h2 className="text-lg font-bold text-white">
            {activeTab === 'overview' ? 'Monitor da Plataforma' : 'Gestão de Vendedores'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Engine Online</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
              <UserCircle size={20} />
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Vendedores Ativos', value: '01', icon: Users, trend: 'Julia Mendes JTT' },
                  { label: 'Eventos Webhook (24h)', value: '0', icon: Activity, trend: 'Monitoramento Ativo' },
                  { label: 'Anúncios TikTok Shop', value: '02', icon: AlertCircle, trend: 'Novas atualizações' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-900 to-gray-800/50 p-6 rounded-3xl border border-gray-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                      <stat.icon size={80} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                      <h3 className="text-3xl font-black text-white mb-4">{stat.value}</h3>
                      <p className="text-[10px] text-flowoff-500 font-bold bg-flowoff-500/10 px-2 py-0.5 rounded-md inline-block">
                        {stat.trend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feed de Anúncios */}
              <div className="bg-gray-900/40 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertCircle className="text-flowoff-400" size={18} />
                    Alertas da Plataforma (Monitor RSS)
                  </h3>
                  <span className="text-[10px] text-gray-500 font-medium">Última atualização: Hoje</span>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {ANNOUNCEMENTS.map((item) => (
                    <div key={item.id} className="p-6 hover:bg-white/5 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-flowoff-500 tracking-tighter uppercase px-2 py-0.5 bg-flowoff-500/10 rounded-md">
                            {item.category}
                          </span>
                          <h4 className="text-sm font-bold text-gray-100 group-hover:text-white transition-colors">{item.title}</h4>
                          <p className="text-xs text-gray-500">{item.date}</p>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-flowoff-400 hover:bg-flowoff-500/10 transition-all shadow-lg"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'sellers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white italic">Hierarquia FlowOff - Vendedores Conectados</h3>
                <button className="px-4 py-2 bg-flowoff-600 hover:bg-flowoff-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-flowoff-600/20">
                  Novo Vendedor +
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {SELLERS.map((seller) => (
                  <div key={seller.id} className="bg-gray-900/60 p-6 rounded-3xl border border-gray-800 flex items-center justify-between group hover:border-gray-700 transition-all shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-flowoff-500 group-hover:bg-flowoff-600 group-hover:text-white transition-all shadow-inner">
                        <UserCircle size={28} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{seller.name}</h4>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] text-gray-500 font-mono">ID: {seller.shopId}</p>
                          <p className="text-[10px] text-gray-500 font-mono">Hierarchy: Seller</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 mb-1">
                          <CheckCircle2 size={12} />
                          {seller.status}
                        </span>
                        <p className="text-[10px] text-gray-500 font-medium tracking-tighter">Tokens Sincronizados</p>
                      </div>
                      <button className="p-2 border border-gray-700 rounded-xl text-gray-500 hover:text-white hover:border-white transition-all">
                        <Settings size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
