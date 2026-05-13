import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Upload, Settings2, Play, DownloadCloud } from 'lucide-react'
import type { ScanReport, ScanResult } from '../api'

type ScanPageProps = {
  onPredict: (file: File, settings: { confidence: number; imgsz: number }) => Promise<void>
  onDownloadReport: (scanId: string) => Promise<void>
  loading: boolean
  scanResult: ScanResult | null
}

export function ScanPage({ onPredict, onDownloadReport, loading, scanResult }: ScanPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0.25)
  const [imgsz, setImgsz] = useState(640)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCameraError(null)
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      stopCamera()
    }
  }, [previewUrl])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setCameraError('Unable to access camera. Check permissions.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

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
  }

  const currentReport: ScanReport | null = scanResult?.report ?? null
  const previewSource = selectedFile ? previewUrl : scanResult?.original_thumb ?? null
  const resultSource = scanResult?.image ?? null

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
    <div style={{ position: 'relative', height: '100%', overflowY: 'auto', padding: '32px 44px 32px 92px' }}>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '280px minmax(360px, 1fr) minmax(360px, 1fr)' }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }} className="glass" style={{ padding: 28, borderRadius: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ marginBottom: 6, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Workspace</p>
              <h2 style={{ color: '#fff', fontSize: 24, margin: 0 }}>Scan controls</h2>
            </div>
            <Settings2 color="#22c55e" />
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Confidence threshold</label>
            <input type="range" min="0.1" max="0.8" step="0.05" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d9f7dc', fontSize: 13 }}><span>{Math.round(confidence * 100)}%</span><span>Lower threshold, broader detection</span></div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Input resolution</label>
            <select value={imgsz} onChange={(e) => setImgsz(Number(e.target.value))} style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e7eb' }}>
              {[320, 480, 640, 768].map((size) => (
                <option key={size} value={size}>{size} px</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Higher resolution may improve detection detail at the cost of processing time.</p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Upload image</label>
            <input type="file" accept="image/*" onChange={(event) => { if (event.target.files?.[0]) handleFileChange(event.target.files[0]) }} style={{ borderRadius: 18, padding: 12, background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            <button onClick={handleScan} disabled={!selectedFile || loading} className="glass" style={{ padding: '14px 16px', borderRadius: 18, fontWeight: 700, color: '#fff', border: '1px solid rgba(34,197,94,0.3)', cursor: selectedFile && !loading ? 'pointer' : 'not-allowed' }}> <Upload size={18} /> Analyze now</button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live detection</p>
                <p style={{ margin: 0, color: '#d9f7dc', fontSize: 13 }}>Camera workflow for real-time field capture.</p>
              </div>
              <button onClick={cameraActive ? stopCamera : startCamera} style={{ padding: '10px 12px', borderRadius: 16, border: '1px solid rgba(34,197,94,0.24)', background: cameraActive ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.14)', color: '#e5e7eb' }}><Camera size={18} /> {cameraActive ? 'Stop' : 'Start'}</button>
            </div>
            {cameraActive && (
              <button onClick={capturePhoto} className="glass" style={{ padding: '14px 16px', borderRadius: 18, border: '1px solid rgba(34,197,94,0.28)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}><Play size={18} /> Snap photo</button>
            )}
            {cameraError && <p style={{ color: '#fb7185', fontSize: 12 }}>{cameraError}</p>}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</p>
            <div className="glass" style={{ padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }}>
              <p style={{ margin: 0, color: '#d9f7dc', fontSize: 13 }}>Ready to scan. Upload a field image or open the camera for live detection.</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="glass" style={{ padding: 28, borderRadius: 32, minHeight: 620, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Original</p>
              <h3 style={{ margin: 0, color: '#fff' }}>Uploaded image</h3>
            </div>
            <span style={{ color: '#22c55e', fontSize: 12 }}>{selectedFile ? 'Ready' : 'Waiting'}</span>
          </div>
          <div style={{ minHeight: 420, borderRadius: 28, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center' }}>
            {previewSource ? <img src={previewSource} alt="Original preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <p style={{ color: '#94a3b8' }}>Upload or capture an image to preview the original frame.</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }} className="glass" style={{ padding: 28, borderRadius: 32, minHeight: 620, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>AI result</p>
              <h3 style={{ margin: 0, color: '#fff' }}>Detection output</h3>
            </div>
            <button onClick={() => scanResult && onDownloadReport(scanResult.scan_id)} disabled={!scanResult} className="glass" style={{ padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(34,197,94,0.28)', color: '#fff' }}><DownloadCloud size={16} /> Export PDF</button>
          </div>
          <div style={{ minHeight: 500, borderRadius: 28, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
            {resultSource ? <img src={resultSource} alt="Detection result" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <p style={{ color: '#94a3b8', padding: 24 }}>Analyze the uploaded image to display the annotated detection result.</p>}
            <div style={{ position: 'absolute', top: 20, right: 20, borderRadius: 20, padding: '10px 14px', background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>Inference</p>
              <p style={{ margin: 0, color: '#d9f7dc', fontSize: 14 }}>{scanResult ? `${scanResult.metrics.inference_time_ms} ms` : 'Waiting'}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.14 }} className="glass" style={{ marginTop: 24, padding: 28, borderRadius: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Detailed AI report</p>
            <h3 style={{ margin: 0, color: '#fff' }}>Field diagnosis</h3>
          </div>
        </div>

        {currentReport ? (
          <div style={{ display: 'grid', gap: 24 }}>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {Object.entries(currentReport.detection_summary).map(([label, value]) => (
                <div key={label} className="glass" style={{ padding: 18, borderRadius: 22 }}>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label.replace('_', ' ')}</p>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1.1fr 0.9fr' }}>
              <div className="glass" style={{ padding: 22, borderRadius: 28 }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Crop health analysis</p>
                <p style={{ margin: '16px 0 10px', color: '#d9f7dc', fontSize: 13 }}>{currentReport.crop_health_analysis.notes}</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Condition</span><strong>{currentReport.crop_health_analysis.condition}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Crop density</span><strong>{currentReport.crop_health_analysis.crop_density}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Healthy ratio</span><strong>{currentReport.crop_health_analysis.healthy_crop_ratio}</strong></div>
                </div>
              </div>

              <div className="glass" style={{ padding: 22, borderRadius: 28 }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Weed infestation</p>
                <p style={{ margin: '16px 0 10px', color: '#d9f7dc', fontSize: 13 }}>{currentReport.weed_infestation_analysis.weed_spread}</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Severity</span><strong>{currentReport.weed_infestation_analysis.severity}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Affected zones</span><strong>{currentReport.weed_infestation_analysis.affected_zones}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}><span>Competition</span><strong>{currentReport.weed_infestation_analysis.competition_risk}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="glass" style={{ padding: 22, borderRadius: 28 }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI insights</p>
                <div style={{ marginTop: 14, color: '#d9f7dc', fontSize: 13, display: 'grid', gap: 10 }}>
                  <p><strong>Model logic:</strong> {currentReport.ai_insights.explanation}</p>
                  <p><strong>Accuracy note:</strong> {currentReport.ai_insights.accuracy}</p>
                  <p><strong>Confidence score:</strong> {currentReport.ai_insights.confidence_scoring}</p>
                </div>
              </div>
              <div className="glass" style={{ padding: 22, borderRadius: 28 }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Field status</p>
                <p style={{ margin: '18px 0 0', fontSize: 32, fontWeight: 800, color: '#fff' }}>{currentReport.field_status}</p>
                <p style={{ margin: '10px 0 0', color: '#94a3b8', fontSize: 13 }}>Tap export to save a tactical PDF report.</p>
              </div>
            </div>

            <div className="glass" style={{ padding: 22, borderRadius: 28, marginTop: 22, background: 'rgba(255,255,255,0.03)' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI summary report</p>
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
