import { motion } from 'framer-motion'
import type { HistoryEntry } from '../api'

type HistoryPageProps = {
  history: HistoryEntry[]
  sampleImages: string[]
  onSelectSampleImage: (filename: string) => Promise<void>
  loading: boolean
}

export function HistoryPage({ history, sampleImages, onSelectSampleImage, loading }: HistoryPageProps) {
  return (
    <div style={{ position: 'relative', height: '100%', overflowY: 'auto', padding: '32px 44px 32px 92px' }}>
      <div style={{ display: 'grid', gap: 24 }}>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass"
          style={{ padding: 28, borderRadius: 32 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Scan history</p>
              <h1 style={{ margin: '10px 0 0', color: '#fff', fontSize: 32 }}>Field history & sample gallery</h1>
            </div>
            <div style={{ minWidth: 220, textAlign: 'right', color: '#cbd5e1' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>History records</p>
              <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13 }}>{history.length} scans recorded</p>
            </div>
          </div>
          <p style={{ marginTop: 18, color: '#cbd5e1', lineHeight: 1.8 }}>Browse past weed detection results, compare crop and weed counts, and tap any sample image to load it directly into the AI workspace.</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="glass"
          style={{ padding: 28, borderRadius: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Sample test images</p>
              <h2 style={{ margin: '10px 0 0', color: '#fff', fontSize: 24 }}>Load a sample field instantly</h2>
            </div>
            <span style={{ color: '#22c55e', fontSize: 12 }}>{loading ? 'Loading sample images…' : `${sampleImages.length} available`}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
            {sampleImages.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 24, background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
                No sample images available. Make sure backend is running and sample data exists.
              </div>
            ) : sampleImages.slice(0, 18).map((filename) => (
              <button
                key={filename}
                type="button"
                onClick={() => onSelectSampleImage(filename)}
                disabled={loading}
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(34,197,94,0.12)',
                  borderRadius: 24,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.04)',
                  padding: 0,
                  minHeight: 170,
                  display: 'grid',
                }}
              >
                <img
                  src={`/test-image/${encodeURIComponent(filename)}`}
                  alt={filename}
                  style={{ width: '100%', height: 140, objectFit: 'cover' }}
                />
                <div style={{ padding: '12px 14px', textAlign: 'left' }}>
                  <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</p>
                  <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 12 }}>Tap to analyze</p>
                </div>
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="glass"
          style={{ padding: 28, borderRadius: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>History timeline</p>
              <h2 style={{ margin: '10px 0 0', color: '#fff', fontSize: 24 }}>Saved scan records</h2>
            </div>
            <span style={{ color: '#22c55e', fontSize: 12 }}>{history.length ? 'Most recent first' : 'No history yet'}</span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {history.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 24, background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
                Your scan history will appear here after the first detection.
              </div>
            ) : history.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 220px',
                  gap: 18,
                  padding: 18,
                  borderRadius: 24,
                  background: 'rgba(255,255,255,0.04)',
                  alignItems: 'center',
                }}
              >
                <img
                  src={entry.result_thumb}
                  alt={`Scan ${entry.id}`}
                  style={{ width: '100%', minHeight: 110, maxHeight: 110, objectFit: 'cover', borderRadius: 20 }}
                />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Scan {entry.id}</p>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{entry.time_ago}</span>
                  </div>
                  <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: 13 }}>File: {entry.filename}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, color: '#94a3b8', fontSize: 13 }}>
                    <span>{entry.crops} crops</span>
                    <span>{entry.weeds} weeds</span>
                    <span>{entry.confidence}% confidence</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                  <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 700 }}>{entry.risk_level}</span>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>History entry</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
