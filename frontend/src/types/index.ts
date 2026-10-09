export interface FleetOverview {
  total_machines: number;
  health_states: {
    Good?: number;
    Warning?: number;
    Critical?: number;
    [key: string]: number | undefined;
  };
  risk_levels: {
    LOW?: number;
    MEDIUM?: number;
    HIGH?: number;
    CRITICAL?: number;
    [key: string]: number | undefined;
  };
  maintenance_priorities: {
    [key: string]: number;
  };
  average_health_score: number;
  average_rul_hours: number;
  machines_requiring_maintenance_count: number;
}

export interface Machine {
  id: number;
  machine_id: string;
  machine_type: string;
  machine_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: number;
  machine_id: string;
  timestamp: string;
  temperature: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  vibration_magnitude: number;
  load_percent: number | null;
  rotational_speed: number | null;
  operating_hours: number;
}

export interface HealthRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  health_score: number;
  health_state: number;
  health_state_label: string;
  anomaly_status: boolean;
  anomaly_score: number | null;
  degradation_status: string;
  degradation_rate: number | null;
  rul_hours: number | null;
  rul_uncertainty_std?: number | null;
  rul_confidence_lower?: number | null;
  rul_confidence_upper?: number | null;
  rul_uncertainty_score?: number | null;
  fft_energy_ratio?: number | null;
  dominant_frequency_hz?: number | null;
}

export interface RiskRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  risk_score: number;
  risk_level: string;
  maintenance_priority: string;
  maintenance_window: string;
  risk_factors: Record<string, any> | null;
}

export interface MaintenanceRecord {
  id: number;
  machine_id: string;
  maintenance_date: string;
  maintenance_type: string;
  component: string;
  description: string;
  action_taken: string;
  sop_code: string | null;
  technician_notes: string | null;
}

export interface RetrievedDocument {
  title: string;
  source: string;
  category: string;
  score: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface RecommendationDecision {
  machine_id: string;
  machine_type?: string;
  timestamp: string;
  current_condition: {
    health_score: number;
    health_state: number | null;
    health_state_label: string;
    anomaly_status: boolean;
    anomaly_score: number | null;
    degradation_status: string;
    degradation_rate: number | null;
    rul_hours: number | null;
    temperature_mean?: number;
    vibration_magnitude_mean?: number;
  };
  risk_assessment: {
    risk_score: number;
    risk_level: string;
    maintenance_priority: string;
    maintenance_time_window: string;
    risk_factors: Record<string, any>;
    risk_breakdown?: Record<string, any>;
  };
  measured_evidence: {
    temperature: number | null;
    vibration_x: number | null;
    vibration_y: number | null;
    vibration_z: number | null;
    vibration_magnitude: number | null;
    operational_hours: number | null;
    load_percent?: number | null;
    rotational_speed?: number | null;
  };
  calculated_evidence: {
    health_score: number;
    health_state_label: string;
    anomaly_detected: boolean;
    anomaly_score: number | null;
    degradation_status: string;
    degradation_slope: number | null;
    rul_hours: number | null;
    risk_score: number;
    risk_level: string;
    maintenance_priority: string;
    estimated_maintenance_time_window: string;
  };
  retrieved_documentary_evidence: RetrievedDocument[];
  generated_explanation: {
    condition_summary: string;
    potential_causes: string[];
    recommended_actions: string[];
    reasoning: string;
    confidence: number;
    source: string;
    sop_references?: string[];
  };
  source_traceability?: {
    machine_id: string;
    primary_manual_referenced: string;
    applicable_standards: string[];
    evidence_counts: {
      measured_points: number;
      calculated_metrics: number;
      retrieved_documents: number;
    };
  };
}

export interface RagDocumentHit {
  title: string;
  source_document: string;
  document_type: string;
  section: string;
  content: string;
  relevance_score: number;
  component?: string | null;
  failure_type?: string | null;
}

export interface RagChatRequest {
  query: string;
  machine_id?: string | null;
  top_k?: number;
}

export interface RagChatResponse {
  query: string;
  response: string;
  machine_id?: string | null;
  machine_context?: {
    machine_id: string;
    machine_type: string;
    machine_name?: string | null;
    health_score?: number | null;
    health_state?: string | null;
    rul_hours?: number | null;
    risk_level?: string | null;
    priority?: string | null;
    temperature?: number | null;
    vibration_magnitude?: number | null;
  } | null;
  cited_documents: RagDocumentHit[];
  suggested_actions: string[];
  confidence: number;
  source: string;
}

