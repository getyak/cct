import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { HistoryRoute } from './routes/HistoryRoute'
import { DetailRoute } from './routes/DetailRoute'
import { DashboardRoute } from './routes/DashboardRoute'

type LinkProps = { to: string; label: string; icon: string }

function NavItem({ to, label, icon }: LinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-purple-900/50 text-purple-300'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-gray-950">
        {/* sidebar */}
        <aside className="w-52 shrink-0 bg-gray-900/80 border-r border-gray-800/60 flex flex-col p-3 gap-0.5">
          <div className="flex items-center gap-2 px-3 py-4 mb-1">
            <span className="text-purple-400 text-lg">⚡</span>
            <span className="font-bold text-sm tracking-wide text-gray-100">CCT</span>
            <span className="text-xs text-gray-600 ml-auto">v0.1</span>
          </div>
          <NavItem to="/history" label="对话历史" icon="💬" />
          <NavItem to="/dashboard" label="数据看板" icon="📊" />
        </aside>

        {/* main */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/history" replace />} />
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/session/:id" element={<DetailRoute />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
