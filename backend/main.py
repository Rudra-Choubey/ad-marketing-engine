from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any
import random
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
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
bandit_stats: Dict[str, Dict[str, int]] = {}  # region -> {creative_id: clicks}

# --------- Helper functions ---------
def _dump(x: Any) -> Any:
    if hasattr(x, "model_dump"):
        return x.model_dump()
    if hasattr(x, "__dict__"):
        return x.__dict__
    return x

def generate_creatives(brand: Dict, brief: Dict, n=3):
    creatives = []
    for i in range(n):
        c = Creative(
            id=f"creative_{i+1}",
            headline=f"{brief['product']} is amazing!",
            primary_text=f"Try {brief['product']} for {brief['audience']}!",
            image_url="https://via.placeholder.com/150"
        )
        creatives.append(c)
    DB["creatives"] = creatives
    return creatives

def localize_creatives(creatives, brief):
    localized = {}
    for region in brief.get("regions", ["IN"]):
        localized[region] = [c for c in creatives]
    return localized

def bandit_choose(region, creative_ids):
    stats = bandit_stats.setdefault(region, {cid: 0 for cid in creative_ids})
    return max(stats, key=stats.get)  # pick highest clicks (naive)

def bandit_update(region, creative_id, clicked):
    stats = bandit_stats.setdefault(region, {})
    stats[creative_id] = stats.get(creative_id, 0) + clicked

def simulate_impression(region, creative):
    return 1 if random.random() < 0.3 else 0

# --------- Routes ---------
@app.post("/brand")
def set_brand(b: Brand):
    DB["brand"] = b
    return {"ok": True}

@app.post("/brief")
def set_brief(br: Brief):
    DB["brief"] = br
    return {"ok": True}

@app.post("/generate")
def generate_endpoint(data: dict = Body(...)):
    product = data.get("product")
    audience = data.get("people")  # map "people" -> audience
    localize_flag = data.get("localize", False)

    if not product or not audience:
        raise HTTPException(400, "product and people are required")

    # Fake brand & brief if not set
    if not DB["brand"]:
        DB["brand"] = {
            "name": "Hackathon Brand",
            "palette": ["#123456"],
            "tone": ["playful"],
            "banned_phrases": [],
            "logo_url": ""
        }

    if not DB["brief"]:
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

    items = generate_creatives(DB["brand"], DB["brief"], n=3)

    return {
        "ad_copy_1": items[0].primary_text if items else "N/A",
        "ad_copy_2": items[1].primary_text if len(items) > 1 else "N/A",
        "creative_brief": f"{product} for {audience} — localized={localize_flag}",
        "performance_score": round(50 + 50 * random.random(), 2)
    }

@app.post("/localize")
def localize_endpoint():
    if not DB["creatives"]:
        raise HTTPException(400, "Run /generate first")
    DB["localized"] = localize_creatives(DB["creatives"], DB["brief"])
    return {k: [_dump(c) for c in v] for k, v in DB["localized"].items()}

@app.get("/serve")
def serve(region: str):
    loc = DB["localized"].get(region, [])
    if not loc:
        raise HTTPException(400, "Run /localize first")
    cid = bandit_choose(region, [c.id for c in loc])
    chosen = next(c for c in loc if c.id == cid)
    return {"region": region, "creative": _dump(chosen)}

@app.post("/feedback")
def feedback_endpoint(f: Feedback):
    bandit_update(f.region, f.creative_id, f.clicked)
    return {"ok": True}

@app.post("/simulate")
def simulate_endpoint(region: str, n: int = 200):
    loc = DB["localized"].get(region, [])
    if not loc:
        raise HTTPException(400, "Run /localize first")
    for _ in range(n):
        cid = bandit_choose(region, [c.id for c in loc])
        cobj = next(c for c in loc if c.id == cid)
        click = simulate_impression(region, cobj)
        bandit_update(region, cid, click)
    return {"ok": True, "events": n}

@app.get("/dashboard")
def dashboard():
    return {
        "brand": _dump(DB["brand"]),
        "brief": _dump(DB["brief"]),
        "creatives": [_dump(c) for c in DB["creatives"]],
        "localized": {k: [_dump(c) for c in v] for k, v in DB["localized"].items()},
        "bandit": bandit_stats,
    }

@app.get("/config")
def config():
    import os
    return {
        "openai_text_model": os.getenv("OPENAI_TEXT_MODEL", "unset"),
        "openai_image_model": os.getenv("OPENAI_IMAGE_MODEL", "unset"),
        "openai_key_present": bool(os.getenv("OPENAI_API_KEY"))
    }