import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { HomePage } from '../../pages/HomePage'
import { ScanPage } from '../../pages/ScanPage'
import { HistoryPage } from '../../pages/HistoryPage'
import {
  exportPdfReport,
  fetchHistory,
  fetchModelInfo,
  fetchSampleImages,
  fetchStats,
  uploadImage,
} from '../../api'
import type { HistoryEntry, ModelInfo, ScanResult, Stats } from '../../api'

const pageMeta: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Home',
    description: 'The cinematic WeedICider command center remains untouched while your navigation is now fully functional.',
  },
  detection: {
    title: 'Scan Workspace',
    description: 'Upload images, run live detection, and generate AI field reports with a transparent futuristic workspace.',
  },
  dashboard: {
    title: 'Dashboard',
    description: 'A compact command view for model statistics and session metrics.',
  },
  history: {
    title: 'History',
    description: 'Review past scans, timestamps, risk levels, and try sample field images.',
  },
  analytics: {
    title: 'Analytics',
    description: 'AI trend analysis for recent detection activity and confidence metrics.',
  },
  recommendations: {
    title: 'Recommendations',
    description: 'Actionable farming recommendations based on the latest scan output.',
  },
  crop: {
    title: 'Crop Health',
    description: 'Crop health insights generated from the detection engine.',
  },
  settings: {
    title: 'Settings',
    description: 'Scan and model configuration settings.',
  },
}

function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ position: 'relative', height: '100%', overflowY: 'auto', padding: '32px 44px 32px 92px' }}>
      <div className="glass" style={{ padding: 28, borderRadius: 32 }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 32 }}>{title}</h1>
        <p style={{ marginTop: 12, color: '#cbd5e1', lineHeight: 1.8 }}>{description}</p>
        <div style={{ marginTop: 32, display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ padding: 22, borderRadius: 28, background: 'rgba(255,255,255,0.04)' }}>
            <h2 style={{ color: '#d1fae5', marginBottom: 10 }}>Status</h2>
            <p style={{ color: '#fff', lineHeight: 1.8 }}>This page is available and ready for future expansion while the main homepage remains unchanged.</p>
          </div>
          <div style={{ padding: 22, borderRadius: 28, background: 'rgba(255,255,255,0.04)' }}>
            <h2 style={{ color: '#d1fae5', marginBottom: 10 }}>Navigation</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>Use the left sidebar icons to move between cinematic home, scanning, history, and analytic pages with the same green transparent theme.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistoryState] = useState<HistoryEntry[]>([])
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [sampleImages, setSampleImages] = useState<string[]>([])

  const activeNav = useMemo(() => {
    const path = location.pathname.split('/')[1]
    return path === '' ? 'home' : path
  }, [location.pathname])

  useEffect(() => {
    void loadStats()
    void loadHistory()
    void loadModelInfo()
    void loadSampleImages()
  }, [])

  const loadStats = async () => {
    try {
      const data = await fetchStats()
      setStats(data)
    } catch {
      // ignore
    }
  }

  const loadHistory = async () => {
    try {
      const data = await fetchHistory()
      setHistoryState(data)
    } catch {
      // ignore
    }
  }

  const loadModelInfo = async () => {
    try {
      const data = await fetchModelInfo()
      setModelInfo(data)
    } catch {
      // ignore
    }
  }

  const loadSampleImages = async () => {
    try {
      const data = await fetchSampleImages()
      setSampleImages(data)
    } catch {
      // ignore
    }
  }

  const handleNav = (id: string) => {
    setError(null)
    navigate(id === 'home' ? '/' : `/${id}`)
  }

  const handlePredict = async (file: File, options: { confidence: number; imgsz: number }) => {
    setLoading(true)
    setError(null)

    try {
      const data = await uploadImage(file, options.confidence, options.imgsz)
      setScanResult(data)
      void navigate('/detection')
      await loadHistory()
      await loadStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    await handlePredict(file, { confidence: 0.25, imgsz: 640 })
  }

  const handleSelectSampleImage = async (filename: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/test-image/${encodeURIComponent(filename)}`)
      if (!response.ok) {
        throw new Error('Unable to load sample image')
      }

      const blob = await response.blob()
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
      await handlePredict(file, { confidence: 0.25, imgsz: 640 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sample image load failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = async (scanId: string) => {
    try {
      const blob = await exportPdfReport(scanId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `weedicider-report-${scanId}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download report')
    }
  }

  const handleLiveDetection = () => {
    setError(null)
    void navigate('/detection')
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#020602' }}>
      <Sidebar active={activeNav} onNav={handleNav} />

      <div style={{ marginLeft: 72, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="page-scan-line" />
        </div>

        {error && (
          <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 30, maxWidth: 420, padding: '14px 18px', borderRadius: 22, background: 'rgba(30, 41, 59, 0.92)', border: '1px solid rgba(34,197,94,0.24)', color: '#f8fafc', boxShadow: '0 18px 48px rgba(0,0,0,0.35)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Action required</p>
            <p style={{ marginTop: 8, color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{error}</p>
          </div>
        )}

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  onImageUpload={handleImageUpload}
                  onLiveDetection={handleLiveDetection}
                  loading={loading}
                  scanResult={scanResult}
                  stats={stats}
                  modelInfo={modelInfo}
                />
              }
            />
            <Route
              path="/detection"
              element={
                <ScanPage
                  onPredict={handlePredict}
                  onDownloadReport={handleDownloadReport}
                  loading={loading}
                  scanResult={scanResult}
                />
              }
            />
            <Route
              path="/history"
              element={
                <HistoryPage
                  history={history}
                  sampleImages={sampleImages}
                  onSelectSampleImage={handleSelectSampleImage}
                  loading={loading}
                />
              }
            />
            <Route path="/dashboard" element={<PagePlaceholder title={pageMeta.dashboard.title} description={pageMeta.dashboard.description} />} />
            <Route path="/analytics" element={<PagePlaceholder title={pageMeta.analytics.title} description={pageMeta.analytics.description} />} />
            <Route path="/recommendations" element={<PagePlaceholder title={pageMeta.recommendations.title} description={pageMeta.recommendations.description} />} />
            <Route path="/crop" element={<PagePlaceholder title={pageMeta.crop.title} description={pageMeta.crop.description} />} />
            <Route path="/settings" element={<PagePlaceholder title={pageMeta.settings.title} description={pageMeta.settings.description} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
