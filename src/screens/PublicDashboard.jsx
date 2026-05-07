import { useState, useEffect, useRef } from 'react'
import Ouroboros from '../components/Ouroboros'
import { supabase } from '../lib/supabase'

const SIGNAL_KEYS = [
  'boundary_dissolution', 'reality_confirmation', 'loop_feeling', 'clarity_shift',
  'ideas_of_reference', 'grandiosity', 'paranoid_ideation', 'emotional_intensity',
]

// Simple clustering: group by dominant signal
function clusterLogs(logs) {
  return logs.map(log => {
    const dominant = SIGNAL_KEYS.reduce((best, k) =>
      (log[k] ?? 0) > (log[best] ?? 0) ? k : best
    , SIGNAL_KEYS[0])
    const avgRisk = SIGNAL_KEYS.reduce((sum, k) => sum + (log[k] ?? 0), 0) / SIGNAL_KEYS.length / 10
    return { ...log, dominant, avgRisk }
  })
}

const CLUSTER_POSITIONS = {
  boundary_dissolution: [22, 25],
  reality_confirmation: [52, 18],
  loop_feeling: [78, 28],
  clarity_shift: [15, 55],
  ideas_of_reference: [85, 55],
  grandiosity: [30, 78],
  paranoid_ideation: [60, 82],
  emotional_intensity: [72, 62],
}

const CLUSTER_LABELS = {
  boundary_dissolution: 'boundary',
  reality_confirmation: 'reality',
  loop_feeling: 'loop',
  clarity_shift: 'clarity',
  ideas_of_reference: 'reference',
  grandiosity: 'grandiosity',
  paranoid_ideation: 'paranoid',
  emotional_intensity: 'emotional',
}

export default function PublicDashboard({ onBack }) {
  const [logs, setLogs] = useState([])
  const [hoveredCluster, setHoveredCluster] = useState(null)
  const [loading, setLoading] = useState(true)
  const svgRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('post_session_logs')
      .select('*, sessions!inner(user_id, users!inner(consent_aggregate))')
      .eq('sessions.users.consent_aggregate', true)
      .limit(500)
    setLogs(data ? clusterLogs(data) : [])
    setLoading(false)
  }

  const grouped = SIGNAL_KEYS.reduce((acc, k) => {
    acc[k] = logs.filter(l => l.dominant === k)
    return acc
  }, {})

  const avgRiskAll = logs.length
    ? logs.reduce((s, l) => s + l.avgRisk, 0) / logs.length
    : 1

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ouroboros risk={1} size="120px" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>aggregate view</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {logs.length} anonymized session{logs.length !== 1 ? 's' : ''} · consented contributors only
          </p>
        </div>
        <button
          onClick={onBack}
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
        >
          ← back
        </button>
      </div>

      {/* visualization area */}
      <div style={{ position: 'relative', flex: 1, minHeight: 500 }}>
        {/* faint background ouroboros */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.06,
          pointerEvents: 'none',
        }}>
          <Ouroboros risk={avgRiskAll * 10} size="80vh" />
        </div>

        {/* dot clusters */}
        {SIGNAL_KEYS.map(k => {
          const [cx, cy] = CLUSTER_POSITIONS[k]
          const cluster = grouped[k] || []
          const clusterRisk = cluster.length
            ? cluster.reduce((s, l) => s + l.avgRisk, 0) / cluster.length
            : 0

          const riskColor = clusterRisk < 0.4
            ? 'var(--text-muted)'
            : clusterRisk < 0.65
              ? '#e8c0b8'
              : clusterRisk < 0.8
                ? '#d4654a'
                : '#c0392b'

          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: `${cx}%`,
                top: `${cy}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredCluster(k)}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              {/* dots */}
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                {cluster.slice(0, 30).map((l, i) => {
                  const angle = (i / Math.max(cluster.length, 1)) * 2 * Math.PI
                  const r = 8 + (i % 3) * 12 + Math.sin(i * 1.7) * 6
                  const x = 40 + r * Math.cos(angle)
                  const y = 40 + r * Math.sin(angle)
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: 5 + l.avgRisk * 4,
                        height: 5 + l.avgRisk * 4,
                        borderRadius: '50%',
                        background: riskColor,
                        opacity: 0.5 + l.avgRisk * 0.4,
                        filter: `blur(${l.avgRisk * 1.5}px)`,
                        transform: 'translate(-50%, -50%)',
                        transition: 'all 0.5s ease',
                      }}
                    />
                  )
                })}
              </div>

              {/* label */}
              <div style={{
                textAlign: 'center',
                fontSize: 11,
                color: hoveredCluster === k ? 'var(--text)' : 'var(--text-muted)',
                letterSpacing: '0.06em',
                transition: 'color 0.3s',
                marginTop: 4,
              }}>
                {CLUSTER_LABELS[k]}
              </div>

              {/* hover tooltip */}
              {hoveredCluster === k && cluster.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '12px 16px',
                  minWidth: 140,
                  zIndex: 10,
                  animation: 'fadeIn 0.2s ease',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    {cluster.length} session{cluster.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    avg risk: {(clusterRisk * 10).toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {logs.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              no public data yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
