import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Accept': 'application/json',
  },
})

// Mock data for frontend-only deployment
const mockStats: Stats = {
  total_scans: 42,
  total_weeds: 380,
  total_crops: 1250,
  avg_confidence: 0.87
}

const mockHistory: HistoryEntry[] = [
  {
    id: 'mock-1',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    time_ago: '1 day ago',
    filename: 'img113_jpg.rf.4592cdb90fe010c714a1c908676e8a1b.jpg',
    crops: 32,
    weeds: 13,
    total: 45,
    confidence: 89,
    risk_level: 'medium',
    crop_pct: 71.1,
    weed_pct: 28.9,
    original_thumb: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgZmlsbD0iIzIyYzU1ZSIvPjx0ZXh0IHg9IjgwIiB5PSI1NSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q3JvcDwvdGV4dD48L3N2Zz4=',
    result_thumb: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgZmlsbD0iIzIyYzU1ZSIvPjx0ZXh0IHg9IjgwIiB5PSI1NSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q3JvcDwvdGV4dD48L3N2Zz4=',
    profile_id: 'default',
    profile_name: 'Demo User'
  },
  {
    id: 'mock-2',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    time_ago: '2 days ago',
    filename: 'weed_0_4388_jpeg.rf.2eaf42a08b9ca656a4fbc9b2d3f68307.jpg',
    crops: 15,
    weeds: 13,
    total: 28,
    confidence: 82,
    risk_level: 'high',
    crop_pct: 53.6,
    weed_pct: 46.4,
    original_thumb: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI2VmNDQ0NCIvPjx0ZXh0IHg9IjgwIiB5PSI1NSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+V2VlZDwvdGV4dD48L3N2Zz4=',
    result_thumb: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI2VmNDQ0NCIvPjx0ZXh0IHg9IjgwIiB5PSI1NSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+V2VlZDwvdGV4dD48L3N2Zz4=',
    profile_id: 'default',
    profile_name: 'Demo User'
  }
]

// Helper functions for localStorage persistence
const getStoredHistory = (): HistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem('weedicider.history')
    return raw ? JSON.parse(raw) : mockHistory
  } catch {
    return mockHistory
  }
}

const getStoredStats = (profileId?: string): Stats => {
  const key = profileId ? `weedicider.stats.${profileId}` : 'weedicider.stats'
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : mockStats
  } catch {
    return mockStats
  }
}

const mockModelInfo: ModelInfo = {
  name: 'YOLOv8 Small',
  architecture: 'YOLOv8',
  classes: ['crop', 'weed'],
  input_size: 640,
  dataset: 'Combined Dataset',
  images_trained: 1200,
  final_mAP50: 0.421,
  final_mAP50_95: 0.312
}

const mockSampleImages: SampleImage[] = [
  {
    filename: 'train/images/img113_jpg.rf.4592cdb90fe010c714a1c908676e8a1b.jpg',
    label: 'crop_heavy',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgZmlsbD0iIzIyYzU1ZSIvPjx0ZXh0IHg9IjMyMCIgeT0iMjQwIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Dcm9wIEhlYXZ5IFNhbXBsZTwvdGV4dD48L3N2Zz4=',
  },
  {
    filename: 'train/images/weed_0_4388_jpeg.rf.2eaf42a08b9ca656a4fbc9b2d3f68307.jpg',
    label: 'weed_heavy',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgZmlsbD0iI2VmNDQ0NCIvPjx0ZXh0IHg9IjMyMCIgeT0iMjQwIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5XZWVkIEhlYXZ5IFNhbXBsZTwvdGV4dD48L3N2Zz4=',
  }
]

// Helper function to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to handle API calls with fallback to mock data
const apiCallWithFallback = async <T>(apiCall: () => Promise<T>, mockData: T): Promise<T> => {
  try {
    return await apiCall()
  } catch (error) {
    console.warn('API call failed, using mock data:', error)
    await delay(100) // Simulate minimal network delay
    return mockData
  }
}

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
  _confidence = 0.25,
  _imgsz = 640,
  profile?: { id: string; name: string },
): Promise<ScanResult> => {
  // Simulate processing delay
  await delay(500)

  // Create mock result based on filename or random
  const isWeedHeavy = file.name.toLowerCase().includes('weed') || Math.random() > 0.6
  const totalDetections = Math.floor(Math.random() * 30) + 15
  const weedCount = isWeedHeavy ? Math.floor(totalDetections * 0.6) : Math.floor(totalDetections * 0.2)
  const cropCount = totalDetections - weedCount

  const mockResult: ScanResult = {
    image: URL.createObjectURL(file),
    original_thumb: URL.createObjectURL(file),
    detections: Array.from({ length: totalDetections }, (_, i) => ({
      class: i < cropCount ? 'crop' : 'weed',
      confidence: 0.7 + Math.random() * 0.3,
      bbox: [Math.random() * 0.8, Math.random() * 0.8, 0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2]
    })),
    metrics: {
      total: totalDetections,
      crops: cropCount,
      weeds: weedCount,
      crop_pct: Math.round((cropCount / totalDetections) * 100 * 10) / 10,
      weed_pct: Math.round((weedCount / totalDetections) * 100 * 10) / 10,
      avg_confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
      inference_time_ms: Math.floor(Math.random() * 200) + 150,
      risk_level: weedCount > cropCount ? 'high' : weedCount > cropCount * 0.3 ? 'medium' : 'low'
    },
    summary: `Detected ${cropCount} crops and ${weedCount} weeds with ${weedCount > cropCount ? 'high' : 'medium'} risk level`,
    recommendations: [
      {
        icon: 'alert-triangle',
        text: weedCount > cropCount ? 'Immediate weed control required' : 'Monitor weed growth'
      },
      {
        icon: 'droplets',
        text: 'Check soil moisture levels'
      },
      {
        icon: 'calendar',
        text: 'Schedule follow-up scan in 3-5 days'
      }
    ],
    report: {
      detection_summary: {
        total_crops: cropCount,
        total_weeds: weedCount,
        confidence: 0.85,
        risk_level: weedCount > cropCount ? 'high' : 'medium',
        weed_ratio: `${Math.round((weedCount / totalDetections) * 100)}%`,
        crop_ratio: `${Math.round((cropCount / totalDetections) * 100)}%`
      },
      crop_health_analysis: {
        condition: cropCount > weedCount ? 'Good' : 'Fair',
        crop_density: cropCount > 20 ? 'Optimal' : 'Sparse',
        healthy_crop_ratio: `${Math.round((cropCount / totalDetections) * 100)}%`,
        notes: 'Analysis based on visual inspection and AI detection'
      },
      weed_infestation_analysis: {
        severity: weedCount > 10 ? 'High' : weedCount > 5 ? 'Medium' : 'Low',
        weed_spread: 'Localized patches detected',
        affected_zones: 'Multiple areas require attention',
        competition_risk: weedCount > cropCount ? 'High' : 'Moderate'
      },
      recommendations: [
        {
          title: 'Immediate Action Required',
          detail: weedCount > cropCount ? 'Apply selective herbicide within 48 hours' : 'Monitor weed growth closely'
        },
        {
          title: 'Crop Protection',
          detail: 'Ensure adequate spacing between crops to reduce competition'
        },
        {
          title: 'Follow-up Monitoring',
          detail: 'Re-scan in 3-5 days to assess treatment effectiveness'
        }
      ],
      ai_insights: {
        explanation: 'AI analysis detected weed patterns using computer vision and machine learning algorithms',
        accuracy: 'High confidence in crop/weed classification',
        confidence_scoring: 'Based on model training with 1200+ agricultural images'
      },
      field_status: weedCount > cropCount ? 'Critical - Immediate intervention needed' : 'Stable - Regular monitoring recommended'
    },
    image_size: { width: 640, height: 480 },
    scan_id: `scan-${Date.now()}`
  }

  // Add to history
  const newEntry: HistoryEntry = {
    id: mockResult.scan_id,
    timestamp: new Date().toISOString(),
    time_ago: 'Just now',
    filename: file.name,
    crops: mockResult.metrics.crops,
    weeds: mockResult.metrics.weeds,
    total: mockResult.metrics.total,
    confidence: mockResult.metrics.avg_confidence * 100,
    risk_level: mockResult.metrics.risk_level,
    crop_pct: mockResult.metrics.crop_pct,
    weed_pct: mockResult.metrics.weed_pct,
    original_thumb: mockResult.original_thumb,
    result_thumb: mockResult.image,
    profile_id: profile?.id || 'default',
    profile_name: profile?.name || 'Demo User'
  }

  const currentHistory = getStoredHistory()
  currentHistory.unshift(newEntry)
  window.localStorage.setItem('weedicider.history', JSON.stringify(currentHistory))

  // Update stats
  const profileId = profile?.id
  const currentStats = getStoredStats(profileId)
  currentStats.total_scans += 1
  currentStats.total_weeds += mockResult.metrics.weeds
  currentStats.total_crops += mockResult.metrics.crops
  currentStats.avg_confidence = Math.round(((currentStats.avg_confidence * (currentStats.total_scans - 1)) + mockResult.metrics.avg_confidence) * 100) / 100
  const statsKey = profileId ? `weedicider.stats.${profileId}` : 'weedicider.stats'
  window.localStorage.setItem(statsKey, JSON.stringify(currentStats))

  return mockResult
}

const profileParams = (profileId?: string) => (
  profileId ? { params: { profile_id: profileId } } : undefined
)

export const fetchStats = async (profileId?: string): Promise<Stats> => {
  return apiCallWithFallback(
    () => client.get('/api/stats', profileParams(profileId)).then(res => res.data),
    getStoredStats(profileId)
  )
}

export const resetMetrics = async (profileId?: string): Promise<Stats> => {
  const resetStats = { ...mockStats }
  const statsKey = profileId ? `weedicider.stats.${profileId}` : 'weedicider.stats'
  window.localStorage.setItem(statsKey, JSON.stringify(resetStats))
  
  // Clear history for this profile
  const currentHistory = getStoredHistory()
  const filteredHistory = currentHistory.filter(entry => profileId && entry.profile_id !== profileId)
  window.localStorage.setItem('weedicider.history', JSON.stringify(filteredHistory))
  
  return apiCallWithFallback(
    () => client.post('/api/reset-metrics', null, profileParams(profileId)).then(res => res.data.stats),
    resetStats
  )
}

export const fetchHistory = async (profileId?: string): Promise<HistoryEntry[]> => {
  return apiCallWithFallback(
    () => client.get('/api/history', profileParams(profileId)).then(res => res.data),
    getStoredHistory().filter(entry => !profileId || entry.profile_id === profileId)
  )
}

export const fetchModelInfo = async (): Promise<ModelInfo> => {
  return apiCallWithFallback(
    () => client.get('/api/model-info').then(res => res.data),
    mockModelInfo
  )
}

export const fetchAnalytics = async (profileId?: string): Promise<{timeline: HistoryEntry[]; summary: Stats}> => {
  return apiCallWithFallback(
    () => client.get('/api/analytics', profileParams(profileId)).then(res => res.data),
    { timeline: mockHistory, summary: mockStats }
  )
}

export const fetchSampleImages = async (): Promise<SampleImage[]> => {
  return apiCallWithFallback(
    () => client.get('/api/sample-images').then(res => res.data),
    mockSampleImages
  )
}

export const fetchBackendStatus = async (): Promise<BackendStatus> => {
  return apiCallWithFallback(
    () => client.get('/api/backend-status').then(res => res.data),
    {
      status: 'demo_mode',
      version: '1.0.0',
      uptime_seconds: 3600,
      model_loaded: true,
      database_connected: false
    }
  )
}

export const exportPdfReport = async (scanId: string): Promise<Blob> => {
  return apiCallWithFallback(
    () => client.get(`/api/export-report/${scanId}`, { responseType: 'blob' }).then(res => res.data),
    new Blob(['Demo PDF Report - Backend not available'], { type: 'application/pdf' })
  )
}

export const fetchRecommendations = async (profileId?: string): Promise<RecommendationsResponse> => {
  return apiCallWithFallback(
    () => client.get('/api/recommendations', profileParams(profileId)).then(res => res.data),
    {
      recommendations: [
        {
          title: 'Immediate Weed Control',
          detail: 'Apply selective herbicide targeting detected weed species within 48 hours.'
        },
        {
          title: 'Crop Nutrition Assessment',
          detail: 'Soil testing recommended to optimize fertilizer application for crop health.'
        },
        {
          title: 'Irrigation Optimization',
          detail: 'Adjust watering schedule based on current crop stress indicators.'
        }
      ],
      risk_assessment: 'Medium risk - Monitor closely for next 7 days'
    }
  )
}

export const fetchCropHealth = async (profileId?: string): Promise<CropHealthResponse> => {
  return apiCallWithFallback(
    () => client.get('/api/crop-health', profileParams(profileId)).then(res => res.data),
    {
      overall_health_score: 7.2,
      crop_density: 'Optimal (85% coverage)',
      stress_indicators: {
        water_stress: 'Low',
        nutritional_deficiency: 'Mild nitrogen deficiency detected',
        disease_pressure: 'None detected',
        weed_competition: 'Moderate'
      },
      recommendations: [
        'Apply nitrogen-rich fertilizer within 3 days',
        'Monitor soil moisture levels',
        'Continue regular scouting for pests'
      ],
      predicted_yield_impact: '+5% with recommended actions'
    }
  )
}
