import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import TruthMonitorPage from './pages/TruthMonitorPage';
import SessionStarterPage from './pages/SessionStarterPage';
import ReplayPage from './pages/ReplayPage';
import AdminConsole from './pages/AdminConsole';
import UserGuidePage from './pages/UserGuidePage';
import AgentConnectionPage from './pages/AgentConnectionPage';

function App() {
  const lastSession = typeof window !== 'undefined' ? window.localStorage.getItem('third-eye.session-id') || '' : '';

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-paper text-slate-100">
        <header className="border-b border-brand-outline/40 bg-brand-paper/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link to="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-eye-sharingan/20 text-2xl">🧿</span>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Third Eye MCP</p>
                <h1 className="text-2xl font-semibold text-white">Overseer Portal</h1>
              </div>
            </Link>
            <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-300">
              <Link className="transition hover:text-brand-accent" to="/">Portal</Link>
              <Link className="transition hover:text-brand-accent" to={lastSession ? `/session/${encodeURIComponent(lastSession)}` : '/'}>
                Monitor
              </Link>
              <Link className="transition hover:text-brand-accent" to="/admin">Metrics</Link>
              <Link className="transition hover:text-brand-accent" to="/guide">
                User Guide
              </Link>
              <Link className="transition hover:text-brand-accent" to="/agents">
                Agent Connection
              </Link>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<SessionStarterPage />} />
          <Route path="/session/:sessionId" element={<TruthMonitorPage />} />
          <Route path="/replay/:sessionId" element={<ReplayPage />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/guide" element={<UserGuidePage />} />
          <Route path="/agents" element={<AgentConnectionPage />} />
          <Route path="*" element={<SessionStarterPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
