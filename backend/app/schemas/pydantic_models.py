from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class MachineBase(BaseModel):
    machine_id: str
    machine_type: str
    machine_name: Optional[str] = None
    status: str = "active"

class MachineResponse(MachineBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SensorReadingResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime
    temperature: float
    vibration_x: float
    vibration_y: float
    vibration_z: float
    vibration_magnitude: float
    load_percent: Optional[float] = None
    rotational_speed: Optional[float] = None
    operating_hours: float

    class Config:
        from_attributes = True

class HealthRecordResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime
    health_score: float
    health_state: int
    health_state_label: str
    anomaly_status: bool
    anomaly_score: Optional[float] = None
    degradation_status: str
    degradation_rate: Optional[float] = None
    rul_hours: Optional[float] = None
    rul_uncertainty_std: Optional[float] = None
    rul_confidence_lower: Optional[float] = None
    rul_confidence_upper: Optional[float] = None
    rul_uncertainty_score: Optional[float] = None
    fft_energy_ratio: Optional[float] = None
    dominant_frequency_hz: Optional[float] = None

    class Config:
        from_attributes = True

class RiskRecordResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime
    risk_score: float
    risk_level: str
    maintenance_priority: str
    maintenance_window: str
    risk_factors: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class MaintenanceRecordResponse(BaseModel):
    id: int
    machine_id: str
    maintenance_date: datetime
    maintenance_type: str
    component: str
    description: str
    action_taken: str
    sop_code: Optional[str] = None
    technician_notes: Optional[str] = None

    class Config:
        from_attributes = True

class FleetOverviewResponse(BaseModel):
    total_machines: int
    health_states: Dict[str, int]
    risk_levels: Dict[str, int]
    maintenance_priorities: Dict[str, int]
    average_health_score: float
    average_rul_hours: float
    machines_requiring_maintenance_count: int

class RagChatRequest(BaseModel):
    query: str
    machine_id: Optional[str] = None
    top_k: int = 4

class RagDocumentHit(BaseModel):
    title: str
    source_document: str
    document_type: str
    section: str
    content: str
    relevance_score: float
    component: Optional[str] = None
    failure_type: Optional[str] = None

class RagChatResponse(BaseModel):
    query: str
    response: str
    machine_id: Optional[str] = None
    machine_context: Optional[Dict[str, Any]] = None
    cited_documents: List[RagDocumentHit]
    suggested_actions: List[str]
    confidence: float
    source: str