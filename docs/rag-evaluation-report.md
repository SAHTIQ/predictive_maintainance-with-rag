# Stage 8 Context-Aware RAG Evaluation Report

## 1. Overview
The Context-Aware Retrieval-Augmented Generation (RAG) knowledge base indexes domain documents across operating manuals, engineering specifications, failure modes, corrective maintenance procedures, and historical case logs.

- Knowledge Base Path: `data/knowledge_base/`
- Indexed Chunks: **18**
- Vector Index Artifact: `backend/ml/models/rag_index.joblib`
- Embedding / Vector Retrieval: **TF-IDF + Normalized Cosine Similarity (N-gram 1-2)**
- Document Categorization:
  - Machine Manuals: 5 chunks (TypeA, TypeB, TypeC, TypeD, TypeE)
  - Specifications: 4 chunks
  - Failure Knowledge Base: 4 chunks (Bearing wear, Unbalance, Misalignment, Lubrication)
  - Corrective Maintenance Procedures: 3 chunks (Bearing replacement SOP, Balancing SOP, Alignment SOP)
  - Historical Case Studies: 2 chunks

---

## 2. Context-Aware Query Formulation Example
For highest-risk machine **TXM-001** (TypeA Centrifugal Pump, Warning Health State, Rapid Degradation, 3.4h RUL):
- **Constructed Query**: `TypeA vibration bearing wear spalling unbalance misalignment temperature overheating lubrication starvation corrective action maintenance procedure inspection protocol emergency shutdown repair SOP`
- **Retrieved Evidence Highlights**:

### Evidence 1: Lubrication Starvation and Thermal Breakdown
- **Source**: `knowledge_base\failure_modes\failure_knowledge.md` (Section: *Boundary Lubrication & Oil Oxidation*)
- **Document Type**: `failure_mode` | **Component**: `lubrication_system`
- **Relevance Score**: **0.1216**
- **Excerpt**:
> Insufficient oil volume, low grease replenishment, or viscous thermal shearing causes boundary metal-to-metal contact.
Symptoms:
- Rapid temperature escalation (> 80°C) preceding significant low-frequency vibration rise.
- Acoustic emission high-freq...

### Evidence 2: Case Log 2024-TXM-014: Bearing Thermal Runaway on TypeA
- **Source**: `knowledge_base\history\historical_case_studies.md` (Section: *Case Summary TXM-014*)
- **Document Type**: `case_study` | **Component**: `bearing`
- **Relevance Score**: **0.1203**
- **Excerpt**:
> Machine TXM-014 (TypeA pump) operated at high load (88%) for 180 continuous hours.
Observation: Vibration_x climbed from 0.45 mm/s to 1.35 mm/s over 36 hours while casing temperature escalated from 62°C to 84°C.
RUL prediction dropped below 8 hours w...

### Evidence 3: Corrective Action for Severe Bearing Degradation (P1/P2)
- **Source**: `knowledge_base\procedures\maintenance_procedures.md` (Section: *Bearing Replacement Protocol SOP-MECH-04*)
- **Document Type**: `procedure` | **Component**: `bearing`
- **Relevance Score**: **0.1035**
- **Excerpt**:
> When a machine exhibits Health State 2 (Critical) or RUL < 24 hours with bearing degradation:
1. Lockout/Tagout (LOTO): Isolate motor drive electrical supply and depressurize process piping.
2. Decouple machine from driver and measure cold shaft runo...

### Evidence 4: Rolling Element Bearing Wear and Flaking
- **Source**: `knowledge_base\failure_modes\failure_knowledge.md` (Section: *Rolling Element Fatigue & Spalling*)
- **Document Type**: `failure_mode` | **Component**: `bearing`
- **Relevance Score**: **0.0997**
- **Excerpt**:
> Bearing degradation progresses through four distinct stages:
Stage 1: Micro-surface subsurface fissures generating high frequency ultrasonic stress waves.
Stage 2: Pitting and spalling on bearing raceways. Vibration harmonics appear in the 500 Hz to ...

---

## 3. Provenance & Source Traceability
Every retrieved item returned by the `ContextAwareRetriever` maintains exact source document attribution, section headings, and component/failure metadata.
Sensor telemetry, machine learning predictions, and documentary recommendations are strictly separated in the output schema to prevent hallucinations in Stage 9.
