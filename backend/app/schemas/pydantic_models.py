from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class MachineBase(BaseModel):
    machine_id: str = Field(..., min_length=2, max_length=50, description="Unique machine identifier or asset tag")
    machine_type: str = Field(..., min_length=1, max_length=50, description="Machine category/type code")
    machine_name: Optional[str] = Field(None, max_length=100)
    installation_date: Optional[datetime] = None
    status: str = Field("Awaiting Data", max_length=30)
    
    # Extended Industry Metadata
    manufacturer: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    plant: Optional[str] = Field(None, max_length=100)
    production_line: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    
    specifications: Optional[Dict[str, Any]] = None
    operational_settings: Optional[Dict[str, Any]] = None
    sensor_config: Optional[Dict[str, Any]] = None

class MachineCreate(MachineBase):
    initial_maintenance_history: Optional[List[Dict[str, Any]]] = None
    initial_maintenance_records: Optional[List[Dict[str, Any]]] = None

class MachineUpdate(BaseModel):
    machine_type: Optional[str] = None
    machine_name: Optional[str] = None
    installation_date: Optional[datetime] = None
    status: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    plant: Optional[str] = None
    production_line: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    operational_settings: Optional[Dict[str, Any]] = None
    sensor_config: Optional[Dict[str, Any]] = None

class MachineResponse(MachineBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_readings: Optional[int] = 0
    monitoring_readiness: Optional[str] = "Awaiting Data"

    class Config:
        from_attributes = True

class MachineIdCheckResponse(BaseModel):
    machine_id: str
    available: bool
    message: str

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