from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Index,
    Integer, String, Text, JSON
)
from sqlalchemy.orm import relationship

from backend.app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), unique=True, nullable=False, index=True)
    machine_type = Column(String(50), nullable=False)
    machine_name = Column(String(100), nullable=True)
    installation_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="Awaiting Data", nullable=False)
    
    # Extended Industry & Facility Metadata
    manufacturer = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    plant = Column(String(100), nullable=True)
    production_line = Column(String(100), nullable=True)
    location = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    
    # JSON Config Blocks for Specifications, Operations & Sensor Configuration
    specifications = Column(JSON, nullable=True)
    operational_settings = Column(JSON, nullable=True)
    sensor_config = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")
    health_records = relationship("HealthRecord", back_populates="machine", cascade="all, delete-orphan")
    risk_records = relationship("RiskRecord", back_populates="machine", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan")
    recommendation_records = relationship("RecommendationRecord", back_populates="machine", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.machine_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    temperature = Column(Float, nullable=False)
    vibration_x = Column(Float, nullable=False)
    vibration_y = Column(Float, nullable=False)
    vibration_z = Column(Float, nullable=False)
    vibration_magnitude = Column(Float, nullable=False)
    load_percent = Column(Float, nullable=True)
    rotational_speed = Column(Float, nullable=True)
    operating_hours = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    machine = relationship("Machine", back_populates="readings")

    __table_args__ = (
        Index("idx_sensor_machine_ts", "machine_id", "timestamp"),
    )


class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.machine_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    health_score = Column(Float, nullable=False)
    health_state = Column(Integer, nullable=False)  # 0: Good, 1: Warning, 2: Critical
    health_state_label = Column(String(20), nullable=False)
    anomaly_status = Column(Boolean, nullable=False)
    anomaly_score = Column(Float, nullable=True)
    degradation_status = Column(String(50), nullable=False)
    degradation_rate = Column(Float, nullable=True)
    rul_hours = Column(Float, nullable=True)
    rul_uncertainty_std = Column(Float, nullable=True)
    rul_confidence_lower = Column(Float, nullable=True)
    rul_confidence_upper = Column(Float, nullable=True)
    rul_uncertainty_score = Column(Float, nullable=True)
    fft_energy_ratio = Column(Float, nullable=True)
    dominant_frequency_hz = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    machine = relationship("Machine", back_populates="health_records")

    __table_args__ = (
        Index("idx_health_machine_ts", "machine_id", "timestamp"),
    )


class RiskRecord(Base):
    __tablename__ = "risk_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.machine_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    maintenance_priority = Column(String(50), nullable=False)
    maintenance_window = Column(String(100), nullable=False)
    risk_factors = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    machine = relationship("Machine", back_populates="risk_records")

    __table_args__ = (
        Index("idx_risk_machine_ts", "machine_id", "timestamp"),
    )


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.machine_id", ondelete="CASCADE"), nullable=False, index=True)
    maintenance_date = Column(DateTime(timezone=True), nullable=False, index=True)
    maintenance_type = Column(String(50), nullable=False)  # PREVENTIVE, CORRECTIVE, EMERGENCY
    component = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=False)
    sop_code = Column(String(50), nullable=True)
    technician_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    machine = relationship("Machine", back_populates="maintenance_records")


class RecommendationRecord(Base):
    __tablename__ = "recommendation_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.machine_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    condition_summary = Column(JSON, nullable=False)
    health_score = Column(Float, nullable=False)
    health_state = Column(String(20), nullable=False)
    rul_hours = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    maintenance_priority = Column(String(50), nullable=False)
    maintenance_window = Column(String(100), nullable=False)
    potential_causes = Column(JSON, nullable=False)
    recommended_actions = Column(JSON, nullable=False)
    reasoning = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    measured_evidence = Column(JSON, nullable=False)
    calculated_evidence = Column(JSON, nullable=False)
    retrieved_documentary_evidence = Column(JSON, nullable=False)
    source_traceability = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    machine = relationship("Machine", back_populates="recommendation_records")

    __table_args__ = (
        Index("idx_rec_machine_ts", "machine_id", "timestamp"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    display_name = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    job_title = Column(String(100), default="Lead Monitorer / Shift Supervisor", nullable=True)
    department = Column(String(100), default="Predictive Maintenance & Reliability", nullable=True)
    plant_assignment = Column(String(100), default="Plant Alpha - Weaving & Spinning", nullable=True)
    preferred_language = Column(String(20), default="en", nullable=False)
    role = Column(String(50), default="Lead Monitorer / Shift Supervisor", nullable=False)
    account_status = Column(String(30), default="Active", nullable=False)
    avatar_url = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    preferences = Column(JSON, nullable=True)
    auth_provider = Column(String(50), default="Resonex Local Identity", nullable=False)
    last_login = Column(DateTime(timezone=True), default=utc_now, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)