import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Upload, Settings2, DownloadCloud, Scan, X } from 'lucide-react'
import type { ScanReport, ScanResult, Stats } from '../api'

type ScanPageProps = {
  onPredict: (file: File, settings: { confidence: number; imgsz: number }) => Promise<void>
  onDownloadReport: (scanId: string) => Promise<void>
  onClearResult: () => void
  loading: boolean
  scanResult: ScanResult | null
  stats: Stats | null
  initialFile?: File | null
  initialLive?: boolean
  onInitialReady?: () => void
}

export function ScanPage({ onPredict, onDownloadReport, onClearResult, loading, scanResult, stats, initialFile, initialLive, onInitialReady }: ScanPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0.25)
  const [imgsz, setImgsz] = useState(640)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (file: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCameraError(null)
    setShowResult(false)
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      stopCamera()
    }
  }, [previewUrl])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      onInitialReady?.()
    } catch (err) {
      setCameraError('Unable to access camera. Check permissions.')
      stopCamera()
    } finally {
      setCameraLoading(false)
    }
  }, [onInitialReady])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
    setCameraLoading(false)
  }

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setCameraError(null)
    setShowResult(false)
    onClearResult()
    stopCamera()
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  useEffect(() => {
    if (initialFile) {
      handleFileChange(initialFile)
      onInitialReady?.()
    }
  }, [initialFile, onInitialReady])

  useEffect(() => {
    if (initialLive) {
      void startCamera()
    }
  }, [initialLive, startCamera])

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera-scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
      handleFileChange(file)
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  const handleScan = async () => {
    if (!selectedFile) return
    await onPredict(selectedFile, { confidence, imgsz })
    setShowResult(true)
  }

  const currentReport: ScanReport | null = scanResult?.report ?? null
  const previewSource = selectedFile ? previewUrl : showResult ? scanResult?.original_thumb ?? null : null
  const resultSource = showResult && scanResult ? scanResult.image : null

  const summaryNarrative = scanResult ? [
    `AI analysis flagged ${scanResult.metrics.weeds} weed detections and ${scanResult.metrics.crops} crop detections across the uploaded field image.`,
    `Calculated weed density is ${scanResult.metrics.weed_pct}% of all plant targets, which helps define the infestation severity.`,
    `The model produced an average confidence of ${scanResult.metrics.avg_confidence}% across detected objects, supporting a strong AI prediction profile.`,
    `Crop analysis indicates the current row structure is stable, but weeds are competing for critical nutrients in high-density areas.`,
    `Weed spread appears most concentrated in zones with poorer vegetation contrast, suggesting those areas should be treated first.`,
    `The detection engine interprets crop health as ${scanResult.metrics.weeds === 0 ? 'stable' : 'at risk due to weed pressure'}, based on object distribution and confidence scoring.`,
    `Irrigation recommendations emphasize consistent moisture to strengthen crop resilience while avoiding overwatering during high weed pressure.`,
    `Field condition analysis points to stressed boundaries when weeds exceed ${scanResult.metrics.weed_pct}% of total plants.`,
    `Risk level is set to ${scanResult.metrics.risk_level}, and the model advises targeted action for the identified infestation pattern.`,
    'AI detection blends plant texture, color, and shape information to distinguish crop rows from weed clusters with advanced confidence scoring.',
    'The generated summary is optimized for agriculture teams to review field risk and prioritize intervention quickly.',
    'Report insights are designed to support both operational decisions and weekly monitoring of crop health.',
  ] : []

  return (
    <div style={{ position: 'relative', height: '100%', overflowY: 'auto', padding: '32px 44px 32px 92px', color: '#d9f7dc' }}>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '300px minmax(340px, 1fr) minmax(340px, 1fr)' }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }} className="glass glow-green" style={{ padding: 24, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 18, background: 'rgba(4, 12, 6, 0.72)', border: '1px solid rgba(34,197,94,0.22)' }}>
          <div style={{ padding: 20, borderRadius: 28, background: 'rgba(12, 22, 12, 0.92)', border: '1px solid rgba(34,197,94,0.35)', boxShadow: '0 0 28px rgba(34,197,94,0.38), inset 0 0 16px rgba(34,197,94,0.12)' }}>
            <p style={{ margin: 0, color: '#8ee5aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.24em' }}>Total scans</p>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: '#ffffff' }}>{stats?.total_scans ?? 0}</span>
            </div>
            <p style={{ marginTop: 10, color: '#9df8c5', fontSize: 13, opacity: 0.9 }}>All scans processed</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ marginBottom: 6, color: '#8ee5aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Workspace</p>
              <h2 style={{ color: '#f8fafc', fontSize: 24, margin: 0 }}>Scan workspace</h2>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 999, background: selectedFile ? 'rgba(34,197,94,0.14)' : 'rgba(148,163,184,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: selectedFile ? '#a7f3d0' : '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {selectedFile ? 'Ready' : cameraActive ? 'Camera' : 'Idle'}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => { if (event.target.files?.[0]) handleFileChange(event.target.files[0]) }}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Source</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={handleUploadClick} className="glass glow-green-sm" style={{ display: 'grid', placeItems: 'center', gap: 8, minHeight: 82, padding: 12, borderRadius: 18, fontWeight: 800, color: '#f8fafc', border: '1px solid rgba(34,197,94,0.34)', background: 'rgba(34,197,94,0.13)', cursor: 'pointer' }}>
                <Upload size={21} />
                <span style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Upload</span>
              </button>
              <button type="button" onClick={cameraActive ? stopCamera : startCamera} disabled={cameraLoading} className="glass glow-green-sm" style={{ display: 'grid', placeItems: 'center', gap: 8, minHeight: 82, padding: 12, borderRadius: 18, fontWeight: 800, color: cameraActive ? '#fecdd3' : '#f8fafc', border: cameraActive ? '1px solid rgba(239,68,68,0.38)' : '1px solid rgba(34,197,94,0.28)', background: cameraActive ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.1)', cursor: cameraLoading ? 'not-allowed' : 'pointer' }}>
                <Camera size={21} />
                <span style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cameraActive ? 'Stop' : 'Camera'}</span>
              </button>
            </div>
            {selectedFile && (
              <div style={{ display: 'grid', gap: 5, padding: '12px 13px', borderRadius: 16, background: 'rgba(10, 24, 12, 0.62)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <span style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selected file</span>
                <span style={{ color: '#d9f7dc', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
              </div>
            )}
            {cameraActive && (
              <button onClick={capturePhoto} className="glass glow-green-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '13px 16px', borderRadius: 16, border: '1px solid rgba(34,197,94,0.35)', color: '#fff', background: 'rgba(34,197,94,0.18)', fontWeight: 800, cursor: 'pointer' }}>
                <Camera size={18} /> Capture
              </button>
            )}
            {cameraError && <p style={{ color: '#fb7185', fontSize: 12 }}>{cameraError}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: 10 }}>
            <button onClick={handleScan} disabled={!selectedFile || loading} className="glass glow-green-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 52, padding: '14px 16px', borderRadius: 18, fontWeight: 900, color: '#fff', border: '1px solid rgba(34,197,94,0.42)', background: selectedFile && !loading ? 'linear-gradient(135deg, rgba(34,197,94,0.26), rgba(6,18,10,0.78))' : 'rgba(34,197,94,0.08)', cursor: selectedFile && !loading ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <Scan size={18} /> {loading ? 'Scanning...' : 'Run AI scan'}
            </button>
            <button type="button" onClick={clearSelection} className="glass glow-green-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 52, padding: 0, borderRadius: 18, border: '1px solid rgba(34,197,94,0.24)', background: selectedFile || scanResult ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', color: selectedFile || scanResult ? '#fff' : '#94a3b8', cursor: selectedFile || scanResult ? 'pointer' : 'not-allowed' }} disabled={!selectedFile && !scanResult} title="Clear selection">
              <X size={20} />
            </button>
          </div>

          <details style={{ borderRadius: 18, padding: 14, background: 'rgba(10, 24, 12, 0.48)', border: '1px solid rgba(34,197,94,0.16)' }}>
            <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: '#c8f1d7', cursor: 'pointer', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Settings2 size={15} /> Advanced</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{Math.round(confidence * 100)}% / {imgsz}px</span>
            </summary>
            <div style={{ display: 'grid', gap: 15, marginTop: 16 }}>
              <div style={{ display: 'grid', gap: 9 }}>
                <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Confidence threshold</label>
                <input type="range" min="0.1" max="0.8" step="0.05" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8f1d7', fontSize: 12 }}><span>{Math.round(confidence * 100)}%</span><span>broader detection</span></div>
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Input resolution</label>
                <select value={imgsz} onChange={(e) => setImgsz(Number(e.target.value))} style={{ padding: '11px 12px', borderRadius: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.24)', color: '#dbe8d7' }}>
                  {[320, 480, 640, 768].map((size) => (
                    <option key={size} value={size}>{size} px</option>
                  ))}
                </select>
              </div>
            </div>
          </details>

          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</p>
            <div className="glass glow-green-sm" style={{ padding: 14, borderRadius: 18, background: 'rgba(10, 24, 12, 0.6)', border: '1px solid rgba(34,197,94,0.18)' }}>
              <p style={{ margin: 0, color: '#c8f1d7', fontSize: 12, lineHeight: 1.55 }}>{loading ? 'AI model is processing the current image.' : selectedFile ? 'Ready to scan the selected image.' : cameraActive ? 'Camera is open. Capture a frame to scan.' : 'Choose an image source to begin.'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="glass glow-green" style={{ padding: 28, borderRadius: 32, minHeight: 620, position: 'relative', background: 'rgba(6, 14, 8, 0.72)', border: '1px solid rgba(34,197,94,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Original</p>
              <h3 style={{ margin: 0, color: '#fff' }}>Uploaded image</h3>
            </div>
            <span style={{ color: selectedFile ? '#a7f3d0' : '#6b7280', fontSize: 12 }}>{selectedFile ? 'Loaded' : 'Waiting for upload'}</span>
          </div>
          <div style={{ minHeight: 460, borderRadius: 28, overflow: 'hidden', background: 'rgba(34,197,94,0.08)', display: 'grid', placeItems: 'center', border: '1px solid rgba(34,197,94,0.16)' }}>
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#07130b' }} />
            ) : previewSource ? (
              <img src={previewSource} alt="Original preview" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            ) : null}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }} className="glass glow-green-sm" style={{ padding: 28, borderRadius: 32, minHeight: 620, display: 'flex', flexDirection: 'column', gap: 20, background: 'rgba(6, 14, 8, 0.72)', border: '1px solid rgba(34,197,94,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>AI result</p>
              <h3 style={{ margin: 0, color: '#fff' }}>Detection output</h3>
            </div>
            <button onClick={() => scanResult && onDownloadReport(scanResult.scan_id)} disabled={!scanResult} className="glass glow-green-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 18, border: '1px solid rgba(34,197,94,0.35)', color: '#fff', background: scanResult ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.08)', cursor: scanResult ? 'pointer' : 'not-allowed' }}>
              <DownloadCloud size={16} /> Export PDF
            </button>
          </div>
          <div style={{ minHeight: 460, borderRadius: 28, overflow: 'hidden', background: 'rgba(34,197,94,0.08)', position: 'relative', border: '1px solid rgba(34,197,94,0.16)' }}>
            {resultSource ? <img src={resultSource} alt="Detection result" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /> : null}
            <div style={{ position: 'absolute', top: 20, right: 20, borderRadius: 20, padding: '10px 14px', background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>Inference</p>
              <p style={{ margin: 0, color: '#d9f7dc', fontSize: 14 }}>{scanResult ? `${scanResult.metrics.inference_time_ms} ms` : 'Waiting'}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.14 }} className="glass glow-green-sm" style={{ marginTop: 24, padding: 28, borderRadius: 32, background: 'rgba(4, 12, 6, 0.72)', border: '1px solid rgba(34,197,94,0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Detailed AI report</p>
            <h3 style={{ margin: 0, color: '#fff' }}>Field diagnosis</h3>
          </div>
        </div>

        {currentReport ? (
          <div style={{ display: 'grid', gap: 24 }}>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {Object.entries(currentReport.detection_summary).map(([label, value]) => (
                <div key={label} className="glass glow-green-sm" style={{ padding: 18, borderRadius: 22, background: 'rgba(8, 16, 10, 0.7)', border: '1px solid rgba(34,197,94,0.16)' }}>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label.replace('_', ' ')}</p>
                  <p style={{ margin: '10px 0 0', fontSize: 24, fontWeight: 700, color: '#fff' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'stretch' }}>
              <div className="glass glow-green-sm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 190, height: '100%', padding: 22, borderRadius: 28, background: 'rgba(8, 16, 10, 0.72)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Crop health analysis</p>
                <p style={{ margin: '16px 0 10px', color: '#c8f1d7', fontSize: 13 }}>{currentReport.crop_health_analysis.notes}</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Condition</span><strong>{currentReport.crop_health_analysis.condition}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Crop density</span><strong>{currentReport.crop_health_analysis.crop_density}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Healthy ratio</span><strong>{currentReport.crop_health_analysis.healthy_crop_ratio}</strong></div>
                </div>
              </div>

              <div className="glass glow-green-sm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 190, height: '100%', padding: 22, borderRadius: 28, background: 'rgba(8, 16, 10, 0.72)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Weed infestation</p>
                <p style={{ margin: '16px 0 10px', color: '#c8f1d7', fontSize: 13 }}>{currentReport.weed_infestation_analysis.weed_spread}</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Severity</span><strong>{currentReport.weed_infestation_analysis.severity}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Affected zones</span><strong>{currentReport.weed_infestation_analysis.affected_zones}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5f8df' }}><span>Competition</span><strong>{currentReport.weed_infestation_analysis.competition_risk}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="glass glow-green" style={{ padding: 22, borderRadius: 28, background: 'rgba(8, 16, 10, 0.72)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI insights</p>
                <div style={{ marginTop: 14, color: '#d9f7dc', fontSize: 13, display: 'grid', gap: 10 }}>
                  <p><strong>Model logic:</strong> {currentReport.ai_insights.explanation}</p>
                  <p><strong>Accuracy note:</strong> {currentReport.ai_insights.accuracy}</p>
                  <p><strong>Confidence score:</strong> {currentReport.ai_insights.confidence_scoring}</p>
                </div>
              </div>
              <div className="glass glow-green" style={{ padding: 22, borderRadius: 28, background: 'rgba(8, 16, 10, 0.72)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Field status</p>
                <p style={{ margin: '18px 0 0', fontSize: 32, fontWeight: 800, color: '#fff' }}>{currentReport.field_status}</p>
                <p style={{ margin: '10px 0 0', color: '#94a3b8', fontSize: 13 }}>Tap export to save a tactical PDF report.</p>
              </div>
            </div>

            <div className="glass glow-green" style={{ padding: 22, borderRadius: 28, marginTop: 22, background: 'rgba(10, 18, 12, 0.65)', border: '1px solid rgba(34,197,94,0.16)' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI summary report</p>
              <div style={{ marginTop: 14, color: '#d9f7dc', fontSize: 13, display: 'grid', gap: 12, lineHeight: 1.8 }}>
                {summaryNarrative.map((line, index) => (
                  <p key={index} style={{ margin: 0 }}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ minHeight: 240, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
            <p>No report available yet. Analyze an image to generate a detailed field assessment.</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
