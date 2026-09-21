# Industrial Machine Engineering Specifications

---
title: Fleet Vibration and Temperature Threshold Matrix
machine_type: all
document_type: specification
component: fleet_wide
section: Vibration Severity & Temperature Criteria
---
In accordance with ISO 10816-3 industrial vibration standards:
- Good Condition (Health State 0): Vibration velocity RMS < 1.1 mm/s, casing temperature < 70°C.
- Warning Condition (Health State 1): Vibration velocity RMS between 1.1 mm/s and 1.8 mm/s, temperature between 70°C and 85°C.
- Critical Condition (Health State 2): Vibration velocity RMS > 1.8 mm/s or temperature > 85°C.
When overall vibration magnitude sqrt(X^2 + Y^2 + Z^2) exceeds 1.5 mm/s combined with rapid degradation rate, immediate inspection is mandated.

---
title: TypeA Engineering Tolerances and Clearances
machine_type: TypeA
document_type: specification
component: bearings_and_shaft
section: Mechanical Clearances & Critical Speeds
---
- Radial internal bearing clearance: 0.035 mm to 0.055 mm (C3 clearance).
- Maximum allowable shaft runout at coupling hub: 0.025 mm TIR.
- First critical bending frequency: 2450 RPM (well above 1800 RPM operating ceiling).
- Peak shock limit: 2.0g on bearing housing before brinelling damage occurs.

---
title: TypeB Aerodynamic and Mechanical Limits
machine_type: TypeB
document_type: specification
component: impeller_and_journal
section: Aerodynamic Load & Thrust Limits
---
- Maximum allowable journal bearing pad temperature: 95°C.
- Maximum allowable axial displacement: +/- 0.25 mm from neutral center.
- Surge limit vibration excursion: trip threshold set at 2.2 mm/s RMS with 1.5 second time delay.

---
title: TypeC Gearbox Torque and Tooth Load Specs
machine_type: TypeC
document_type: specification
component: gearing
section: Contact Pattern & Backlash
---
- Normal gear backlash: 0.12 mm to 0.22 mm.
- Tooth face contact pattern must exceed 75% length and 50% height in unloaded static blueing check.
- Oil particulate contamination limit: ISO 4406 cleanliness code 17/15/12.