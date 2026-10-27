#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
required=["README.md","AGENTS.md","CONTRIBUTING.md","SECURITY.md","CODE_OF_CONDUCT.md","docs/product/PRD.md","docs/architecture/ARCHITECTURE.md","docs/design/DESIGN_SYSTEM.md","docs/security/FINANCIAL_READ_ONLY_POLICY.md","docs/decisions/ADR-0004-OPEN-SOURCE-AND-INFRA.md","docs/development/BOOTSTRAP.md","infra/prisma/schema.prisma"]
missing=[s for s in required if not (root/s).is_file()]
for bad in ["compose.yaml",".prettierrc",".prettierrc.json","prettier.config.js","docs/agents"]:
 if (root/bad).exists():missing.append("arquivo/pasta proibido: "+bad)
if missing:
 print("FAIL: "+", ".join(missing)); raise SystemExit(1)
print("PASS: kit documental básico presente; sem Docker, Prettier ou docs/agents")
