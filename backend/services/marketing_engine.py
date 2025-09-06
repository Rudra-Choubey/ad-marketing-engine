# backend/services/marketing_engine.py
import uuid, random, math
from typing import List, Dict
from dataclasses import dataclass

# local imports inside functions to avoid circular import
@dataclass
class Creative:
    id: str
    region: str
    headline: str
    primary_text: str
    image_url: str
    scores: Dict[str, float]

def brand_score() -> float:
    return round(0.6 + 0.4 * random.random(), 2)

def generate_creatives(brand, brief, n=3) -> List[Creative]:
    from ..models.inference import generate_copy_gpt, generate_image_gpt

    copies = generate_copy_gpt(brand, brief, n=n)
    out = []
    for c in copies:
        cid = f"C{uuid.uuid4().hex[:6]}"
        img_url = generate_image_gpt(brand, brief, c)
        out.append(Creative(
            id=cid,
            region="base",
            headline=c["headline"][:40],
            primary_text=c["primary_text"][:120],
            image_url=img_url,
            scores={"brand": brand_score()}
        ))
    return out

def localize_creatives(creatives: List[Creative], brief) -> Dict[str, List[Creative]]:
    from ..models.inference import transcreate_copy_gpt

    regions = brief.get("regions", ["IN"])
    by_region = {r: [] for r in regions}
    brand = {"name": "Hackathon Brand"}  # dummy brand

    for c in creatives:
        base = {"headline": c.headline, "primary_text": c.primary_text}
        for r in regions:
            loc = transcreate_copy_gpt(brand, brief, base, r)
            rid = f"{c.id}-{r}"
            by_region[r].append(Creative(
                id=rid,
                region=r,
                headline=loc["headline"][:40],
                primary_text=loc["primary_text"][:120],
                image_url=c.image_url,
                scores=c.scores.copy()
            ))
    return by_region

# Simple Thompson Sampling
class Bandit:
    def __init__(self):
        self.state: Dict = {}

    def _key(self, region, cid): return (region, cid)
    def ensure(self, region, cid):
        if self._key(region, cid) not in self.state:
            self.state[self._key(region, cid)] = [1.0, 1.0, 0, 0]

    def choose(self, region, cids):
        best, best_theta = None, -1
        for cid in cids:
            self.ensure(region, cid)
            a, b, *_ = self.state[(region, cid)]
            theta = random.betavariate(a, b)
            if theta > best_theta:
                best_theta, best = theta, cid
        return best

    def update(self, region, cid, clicked):
        a, b, imp, clk = self.state[self._key(region, cid)]
        if clicked: a += 1
        else: b += 1
        imp += 1; clk += clicked
        self.state[self._key(region, cid)] = [a, b, imp, clk]

    def snapshot(self):
        rows = []
        for (region, cid), (a, b, imp, clk) in self.state.items():
            ctr = (clk/imp) if imp>0 else 0
            rows.append({"region": region, "creative_id": cid, "alpha": a, "beta": b, "impressions": imp, "clicks": clk, "ctr": round(ctr,4)})
        return rows

bandit = Bandit()