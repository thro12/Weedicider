import axios from 'axios'

const client = axios.create({
  baseURL: '/',
  headers: {
    'Accept': 'application/json',
  },
})

export type DetectionMetrics = {
  total: number
  crops: number
  weeds: number
  crop_pct: number
  weed_pct: number
  avg_confidence: number
  inference_time_ms: number
  risk_level: string
}

export type ScanReport = {
  detection_summary: {
    total_crops: number
    total_weeds: number
    confidence: number
    risk_level: string
    weed_ratio: string
    crop_ratio: string
  }
  crop_health_analysis: {
    condition: string
    crop_density: string
    healthy_crop_ratio: string
    notes: string
  }
  weed_infestation_analysis: {
    severity: string
    weed_spread: string
    affected_zones: string
    competition_risk: string
  }
  recommendations: Array<{ title: string; detail: string }>
  ai_insights: { explanation: string; accuracy: string; confidence_scoring: string }
  field_status: string
}

export type ScanResult = {
  image: string
  original_thumb: string
  detections: Array<{ class: string; confidence: number; bbox: number[] }>
  metrics: DetectionMetrics
  summary: string
  recommendations: Array<{ icon: string; text: string }>
  report: ScanReport
  image_size: { width: number; height: number }
  scan_id: string
}

export type HistoryEntry = {
  id: string
  timestamp: string
  time_ago: string
  filename: string
  crops: number
  weeds: number
  total: number
  confidence: number
  risk_level: string
  original_thumb: string
  result_thumb: string
  report?: ScanReport
}

export type Stats = {
  total_scans: number
  total_weeds: number
  total_crops: number
  avg_confidence: number
}

export type ModelInfo = {
  name: string
  architecture: string
  classes: string[]
  input_size: number
  dataset: string
  images_trained: number
  final_mAP50: number
  final_mAP50_95: number
}

export type BackendStatus = {
  status: string
  model_loaded: boolean
  model_path: string
  loaded_classes: string[]
  history_count: number
  server_time: string
}

export const uploadImage = async (
  file: File,
  confidence = 0.25,
  imgsz = 640,
): Promise<ScanResult> => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('confidence', String(confidence))
  formData.append('imgsz', String(imgsz))
  const response = await client.post('/predict', formData)
  return response.data
}

export const fetchStats = async (): Promise<Stats> => {
  const response = await client.get('/stats')
  return response.data
}

export const fetchHistory = async (): Promise<HistoryEntry[]> => {
  const response = await client.get('/history')
  return response.data
}

export const fetchModelInfo = async (): Promise<ModelInfo> => {
  const response = await client.get('/model-info')
  return response.data
}

export const fetchAnalytics = async (): Promise<{timeline: HistoryEntry[]; summary: Stats}> => {
  const response = await client.get('/analytics')
  return response.data
}

export const fetchSampleImages = async (): Promise<string[]> => {
  const response = await client.get('/sample-images')
  return response.data
}

export const fetchBackendStatus = async (): Promise<BackendStatus> => {
  const response = await client.get('/backend-status')
  return response.data
}

export const exportPdfReport = async (scanId: string): Promise<Blob> => {
  const response = await client.get(`/export-report/${scanId}`, {
    responseType: 'blob',
  })
  return response.data
}
