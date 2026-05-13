import { useRef, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Search, Upload, Camera } from 'lucide-react'
import { HeroScanOverlay } from '../components/hero/HeroScanOverlay'
import { StatsRow } from '../components/stats/StatsRow'
import type { ModelInfo, ScanResult, Stats } from '../api'

type HomePageProps = {
  onImageUpload: (file: File) => Promise<void>
  onLiveDetection: () => void
  loading: boolean
  scanResult: ScanResult | null
  stats: Stats | null
  modelInfo: ModelInfo | null
}

export function HomePage({ onImageUpload, onLiveDetection, loading, scanResult }: HomePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = () => fileInputRef.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImageUpload(file)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(90deg, rgba(2, 8, 5, 0.96) 0%, rgba(2, 8, 5, 0.18) 42%, rgba(2, 8, 5, 0.00) 100%), url('/hero-cinematic.png')`,
        backgroundSize: 'auto 100%',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 32, padding: '30px 40px 40px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 280, padding: '12px 18px', borderRadius: 999, background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(34,197,94,0.18)', backdropFilter: 'blur(16px)' }}>
            <Search size={16} color='#a7f3d0' />
            <input
              placeholder='Search anything...'
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(420px, 540px) 1fr', gap: 40, alignItems: 'start' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(34,197,94,0.28)', background: 'rgba(34,197,94,0.14)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ color: '#a7f3d0', fontSize: 11, fontWeight: 700 }}>AI-Powered Weed Detection</span>
              </div>

              <h1 style={{ color: '#ffffff', fontSize: 'clamp(2.4rem, 3.8vw, 3.6rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em' }}>
                AI-Powered<br />
                <span style={{ color: '#22c55e' }}>Weed Detection</span><br />
                for Smarter Farming
              </h1>

              <p style={{ color: 'rgba(226,232,240,0.84)', fontSize: 15, lineHeight: 1.7, maxWidth: 500 }}>
                Detect weeds early, protect your crops, and increase your yield with the power of AI.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleFileClick}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '18px 26px',
                    borderRadius: 18,
                    border: '1px solid rgba(34,197,94,0.45)',
                    background: 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.08))',
                    color: '#f8fafc',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 18px 40px rgba(34,197,94,0.12)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <Upload size={18} color='#22c55e' />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Upload Image</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.72)' }}>JPG, PNG, WebP</div>
                  </div>
                </button>

                <button
                  onClick={onLiveDetection}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '18px 26px',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(20, 30, 24, 0.85)',
                    color: '#f8fafc',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 14px 30px rgba(0,0,0,0.22)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <Camera size={18} color='rgba(148,163,184,0.9)' />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Live Detection</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.72)' }}>Use Camera</div>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>

          <div style={{ position: 'relative', minHeight: 520, width: '100%', minWidth: 260 }}>
            <HeroScanOverlay />
          </div>
        </div>

        <StatsRow metrics={scanResult?.metrics} />
      </div>
    </div>
  )
}
