import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: apiBaseUrl,
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
    crop_vigor_score?: number
    yield_loss_prediction?: number | string
    water_stress_level?: string
    nutritional_status?: string
    disease_risk?: string
    estimated_damage_cost?: number | string
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
  crop_pct?: number
  weed_pct?: number
  original_thumb: string
  result_thumb: string
  profile_id?: string
  profile_name?: string
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

export type SampleImage = {
  filename: string
  label: string
  url: string
}

export type Recommendation = {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'immediate' | 'scheduled' | 'preventive'
  estimated_cost: number
  timeline: string
  actions: string[]
  risk_level: string
  potential_impact: string
  confidence: number
}

export type RecommendationsResponse = {
  recommendations: Recommendation[]
  stats: {
    total_scans: number
    avg_weed_percentage: number
    risk_trend: string
    total_recommendations: number
    estimated_cost: number
    potential_savings: number
  }
  analysis: {
    weed_pressure_level: string
    recommended_action_frequency: string
    cost_benefit_ratio: number
  }
}

export type CropHealthTrend = {
  scan_index: number
  vigor_score: number
  crop_pct: number
  weed_pct: number
  timestamp: string
}

export type HealthRecommendation = {
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  action: string
}

export type CropHealthResponse = {
  current_health: {
    crop_vigor_score: number
    condition: string
    crop_percentage: number
    weed_percentage: number
    confidence_level: number
    timestamp: string
  }
  health_metrics: {
    yield_loss_prediction: string
    water_stress_level: string
    nutritional_status: string
    disease_risk: string
    estimated_damage_cost: string
    days_until_critical: number
  }
  trends: CropHealthTrend[]
  recommendations: HealthRecommendation[]
  summary: {
    total_scans: number
    avg_crop_percentage: number
    avg_weed_percentage: number
    health_trend: string
  }
}

export const uploadImage = async (
  file: File,
  confidence = 0.25,
  imgsz = 640,
  profile?: { id: string; name: string },
): Promise<ScanResult> => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('confidence', String(confidence))
  formData.append('imgsz', String(imgsz))
  if (profile) {
    formData.append('profile_id', profile.id)
    formData.append('profile_name', profile.name)
  }
  const response = await client.post('/api/predict', formData)
  return response.data
}

const profileParams = (profileId?: string) => (
  profileId ? { params: { profile_id: profileId } } : undefined
)

export const fetchStats = async (profileId?: string): Promise<Stats> => {
  const response = await client.get('/api/stats', profileParams(profileId))
  return response.data
}

export const resetMetrics = async (profileId?: string): Promise<Stats> => {
  const response = await client.post('/api/reset-metrics', null, profileParams(profileId))
  return response.data.stats
}

export const fetchHistory = async (profileId?: string): Promise<HistoryEntry[]> => {
  const response = await client.get('/api/history', profileParams(profileId))
  return response.data
}

export const fetchModelInfo = async (): Promise<ModelInfo> => {
  const response = await client.get('/api/model-info')
  return response.data
}

export const fetchAnalytics = async (profileId?: string): Promise<{timeline: HistoryEntry[]; summary: Stats}> => {
  const response = await client.get('/api/analytics', profileParams(profileId))
  return response.data
}

export const fetchSampleImages = async (): Promise<SampleImage[]> => {
  const response = await client.get('/api/sample-images')
  return response.data
}

export const fetchBackendStatus = async (): Promise<BackendStatus> => {
  const response = await client.get('/api/backend-status')
  return response.data
}

export const exportPdfReport = async (scanId: string): Promise<Blob> => {
  const response = await client.get(`/api/export-report/${scanId}`, {
    responseType: 'blob',
  })
  return response.data
}

export const fetchRecommendations = async (profileId?: string): Promise<RecommendationsResponse> => {
  const response = await client.get('/api/recommendations', profileParams(profileId))
  return response.data
}

export const fetchCropHealth = async (profileId?: string): Promise<CropHealthResponse> => {
  const response = await client.get('/api/crop-health', profileParams(profileId))
  return response.data
}
