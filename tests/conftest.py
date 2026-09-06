"""TerraGuardian test configuration and fixtures."""

import sys
from pathlib import Path

# Add services/api to sys.path so that tests can import app modules directly
api_path = Path(__file__).resolve().parent.parent / "services" / "api"
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))
