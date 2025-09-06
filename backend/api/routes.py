from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import random
import uuid

from ..services.marketing_engine import (
    generate_creatives,
    localize_creatives,
    bandit,
    brand_score,
)

router = APIRouter()

router.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # allows GET, POST, OPTIONS etc.
    allow_headers=["*"],
)

# --------- Schemas ---------
class Brand(BaseModel):
    name: str
    palette: List[str]
    tone: List[str] = ["playful"]
    banned_phrases: List[str] = []
    logo_url: str = ""

class Brief(BaseModel):
    product: str
    audience: str
    value_props: List[str]
    cta: str
    channels: List[str] = ["Instagram"]
    regions: List[str] = ["IN", "US"]

class Creative(BaseModel):
    id: str
    region: str = "base"
    headline: str
    primary_text: str
    image_url: str
    scores: Dict[str, float] = {}

class Feedback(BaseModel):
    creative_id: str
    region: str
    clicked: int  # 0/1

# --------- In-memory DB ---------
DB: Dict[str, Any] = {"brand": None, "brief": None, "creatives": [], "localized": {}}

# --------- Helpers ---------
def _dump(x: Any) -> Any:
    if hasattr(x, "model_dump"):
        return x.model_dump()
    if hasattr(x, "__dict__"):
        return x.__dict__
    return x

def simulate_impression(region, creative):
    """Simulate a click with 30% probability"""
    return 1 if random.random() < 0.3 else 0

# --------- Routes ---------
@router.post("/brand")
def set_brand(b: Brand):
    DB["brand"] = b
    return {"ok": True}

@router.post("/brief")
def set_brief(br: Brief):
    DB["brief"] = br
    return {"ok": True}

@router.post("/generate")
def generate(data: dict = Body(...)):
    """
    Accepts frontend body: { product, price, place, promotion, people, localize }
    Builds a quick brand/brief that matches what the services expect.
    """
    product = data.get("product")
    audience = data.get("people")  # "people" field maps to brief.audience
    localize_flag = data.get("localize", False)

    if not product or not audience:
        raise HTTPException(status_code=400, detail="product and people are required")

    # Temporary brand
    DB["brand"] = {
        "name": "Hackathon Brand",
        "palette": ["#123456"],
        "tone": ["playful"],
        "banned_phrases": [],
        "logo_url": ""
    }

    # Temporary brief
    DB["brief"] = {
        "product": product,
        "audience": audience,
        "value_props": [
            f"Premium pricing: {data.get('price', 'N/A')}",
            f"Available at: {data.get('place', 'N/A')}",
            f"Promotion style: {data.get('promotion', 'N/A')}"
        ],
        "cta": "Buy now",
        "channels": ["Instagram"],
        "regions": ["IN", "US"] if localize_flag else ["IN"]
    }

    # Generate creatives
    items = generate_creatives(DB["brand"], DB["brief"], n=3)
    DB["creatives"] = items

    return {
        "ad_copy_1": items[0].primary_text if items else "N/A",
        "ad_copy_2": items[1].primary_text if len(items) > 1 else "N/A",
        "creative_brief": f"{product} for {audience} — localized={localize_flag}",
        "performance_score": round(50 + 50 * random.random(), 2)
    }


@router.post("/localize")
def localize():
    if not DB["creatives"]:
        raise HTTPException(status_code=400, detail="Run /generate first")
    reg = localize_creatives(DB["creatives"], DB["brief"])
    DB["localized"] = reg
    return {k: [_dump(c) for c in v] for k, v in reg.items()}

@router.get("/serve")
def serve(region: str):
    loc = DB["localized"].get(region, [])
    if not loc:
        raise HTTPException(status_code=400, detail="Run /localize first")
    cid = bandit.choose(region, [c.id for c in loc])
    chosen = next(c for c in loc if c.id == cid)
    return {"region": region, "creative": _dump(chosen)}

@router.post("/feedback")
def feedback(f: Feedback):
    bandit.update(f.region, f.creative_id, f.clicked)
    return {"ok": True}

@router.post("/simulate")
def simulate(region: str, n: int = 200):
    loc = DB["localized"].get(region, [])
    if not loc:
        raise HTTPException(status_code=400, detail="Run /localize first")
    for _ in range(n):
        cid = bandit.choose(region, [c.id for c in loc])
        cobj = next(c for c in loc if c.id == cid)
        click = simulate_impression(region, cobj)
        bandit.update(region, cid, click)
    return {"ok": True, "events": n}

@router.get("/dashboard")
def dashboard():
    return {
        "brand": _dump(DB["brand"]),
        "brief": _dump(DB["brief"]),
        "creatives": [_dump(c) for c in DB["creatives"]],
        "localized": {k: [_dump(c) for c in v] for k, v in DB["localized"].items()},
        "bandit": bandit.snapshot(),
    }

@router.get("/config")
def config():
    return {
        "openai_text_model": os.getenv("OPENAI_TEXT_MODEL", "unset"),
        "openai_image_model": os.getenv("OPENAI_IMAGE_MODEL", "unset"),
        "openai_key_present": bool(os.getenv("OPENAI_API_KEY"))
    }
