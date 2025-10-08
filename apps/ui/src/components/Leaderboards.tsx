import { useEffect, useState } from 'react';

type LeaderboardCategory = 'fastest' | 'cheapest' | 'reliable' | 'popular' | 'quality';

interface LeaderboardEntry {
  rank: number;
  provider: string;
  model: string;
  score: number;
  totalRuns: number;
  avgLatency?: number;
  avgCost?: number;
  successRate?: number;
}

export interface LeaderboardsProps {
  defaultCategory?: LeaderboardCategory;
  defaultEye?: string;
  defaultDays?: number;
}

export function Leaderboards({
  defaultCategory = 'fastest',
  defaultEye = '',
  defaultDays = 30,
}: LeaderboardsProps) {
  const [category, setCategory] = useState<LeaderboardCategory>(defaultCategory);
  const [eye, setEye] = useState(defaultEye);
  const [days, setDays] = useState(defaultDays);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRankings();
  }, [category, eye, days]);

  async function fetchRankings() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eye) params.set('eye', eye);
      params.set('days', days.toString());

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const res = await fetch(`${API_URL}/api/leaderboards/${category}?${params}`);
      const data = await res.json();
      setRankings(data.rankings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  const categories: LeaderboardCategory[] = ['fastest', 'cheapest', 'reliable', 'popular', 'quality'];

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const formatScore = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'fastest': return `${(entry.avgLatency || 0).toFixed(2)}s`;
      case 'cheapest': return `$${(entry.avgCost || 0).toFixed(4)}`;
      case 'reliable': return `${entry.score.toFixed(1)}%`;
      case 'popular': return `${entry.totalRuns} runs`;
      case 'quality': return `${entry.score.toFixed(1)}/100`;
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-6 text-sm">
      <header className="mb-4">
        <h3 className="text-xl font-bold text-white">🏆 Leaderboards</h3>
        <p className="text-xs text-slate-400 mt-1">Model performance rankings</p>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 border-b border-brand-outline/30 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              category === cat
                ? 'bg-brand-accent text-white'
                : 'text-slate-400 hover:text-white hover:bg-brand-paper'
            }`}
          >
            {cat === 'fastest' && '⚡'}
            {cat === 'cheapest' && '💰'}
            {cat === 'reliable' && '🛡️'}
            {cat === 'popular' && '🔥'}
            {cat === 'quality' && '⭐'}
            {' '}{cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={eye}
          onChange={(e) => setEye(e.target.value)}
          className="px-3 py-1.5 text-xs bg-brand-paper border border-brand-outline/30 rounded text-white"
        >
          <option value="">All Eyes</option>
          <option value="sharingan">Sharingan</option>
          <option value="rinnegan">Rinnegan</option>
          <option value="byakugan">Byakugan</option>
          <option value="tenseigan">Tenseigan</option>
          <option value="mangekyo">Mangekyo</option>
          <option value="jogan">Jogan</option>
          <option value="overseer">Overseer</option>
        </select>

        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-3 py-1.5 text-xs bg-brand-paper border border-brand-outline/30 rounded text-white"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">All time</option>
        </select>
      </div>

      {/* Rankings */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : error ? (
        <div className="text-rose-300 text-xs">{error}</div>
      ) : rankings.length === 0 ? (
        <div className="text-slate-400 text-xs text-center py-8">No data available</div>
      ) : (
        <div className="space-y-2">
          {rankings.map((entry) => (
            <div
              key={`${entry.provider}-${entry.model}`}
              className={`flex items-center justify-between p-2 rounded ${
                entry.rank <= 3 ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-brand-paper/50'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-lg">{getRankEmoji(entry.rank)}</span>
                <div>
                  <div className="text-white font-medium text-xs">{entry.model}</div>
                  <div className="text-slate-500 text-[10px]">{entry.provider}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-brand-accent font-bold text-sm">{formatScore(entry)}</div>
                <div className="text-slate-500 text-[10px]">{entry.totalRuns} runs</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Leaderboards;
