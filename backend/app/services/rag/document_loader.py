import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

@dataclass
class DocumentChunk:
    chunk_id: str
    document_id: str
    title: str
    document_type: str  # manual, specification, failure_mode, procedure, case_study
    machine_type: str   # TypeA, TypeB, TypeC, TypeD, TypeE, all
    component: str      # bearing, rotor, gearbox, motor, fleet_wide, general
    section: str
    content: str
    source_file: str
    failure_type: Optional[str] = None
    machine_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class MarkdownKnowledgeBaseLoader:
    """
    Parses frontmatter-tagged or sectioned Markdown knowledge base documents
    and splits them into semantically rich, metadata-attributed chunks.
    """
    def __init__(self, kb_dir: Path):
        self.kb_dir = kb_dir

    def parse_frontmatter(self, text: str) -> tuple[Dict[str, str], str]:
        metadata = {}
        content = text
        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                header_lines = parts[1].strip().splitlines()
                for line in header_lines:
                    if ":" in line:
                        k, v = line.split(":", 1)
                        metadata[k.strip()] = v.strip()
                content = parts[2].strip()
        return metadata, content

    def load_documents(self) -> List[DocumentChunk]:
        chunks = []
        md_files = list(self.kb_dir.rglob("*.md"))
        
        chunk_idx = 1
        for f in md_files:
            text = f.read_text(encoding="utf-8")
            parts = text.split("---")
            
            # Iterate through pairs: header (odd idx) and body (even idx)
            i = 1
            while i < len(parts) - 1:
                header_text = parts[i].strip()
                body_text = parts[i+1].strip()
                
                meta = {}
                for line in header_text.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        meta[k.strip()] = v.strip()
                        
                if meta.get("title") or meta.get("document_type"):
                    chunk = DocumentChunk(
                        chunk_id=f"chunk_{chunk_idx:04d}",
                        document_id=f"{f.stem}_{chunk_idx:03d}",
                        title=meta.get("title", f.stem),
                        document_type=meta.get("document_type", "general"),
                        machine_type=meta.get("machine_type", "all"),
                        component=meta.get("component", "general"),
                        section=meta.get("section", "General"),
                        content=body_text,
                        source_file=str(f.relative_to(f.parents[2])).replace("\\\\", "/"),
                        failure_type=meta.get("failure_type"),
                        machine_id=meta.get("machine_id")
                    )
                    chunks.append(chunk)
                    chunk_idx += 1
                i += 2
                
            # If file had no frontmatter pairs, fallback to paragraph chunking
            if not chunks or (chunk_idx == 1):
                paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50 and not p.startswith("#")]
                for p in paragraphs:
                    chunk = DocumentChunk(
                        chunk_id=f"chunk_{chunk_idx:04d}",
                        document_id=f"{f.stem}_{chunk_idx:03d}",
                        title=f.stem.replace("_", " ").title(),
                        document_type="reference",
                        machine_type="all",
                        component="general",
                        section="Reference Content",
                        content=p.strip(),
                        source_file=str(f.relative_to(f.parents[2])).replace("\\\\", "/"),
                    )
                    chunks.append(chunk)
                    chunk_idx += 1
                    
        return chunks