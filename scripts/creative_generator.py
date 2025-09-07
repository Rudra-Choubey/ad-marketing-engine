#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import io
import json
import time
import random
from typing import Dict
import argparse

import google.generativeai as genai
from PIL import Image, UnidentifiedImageError
from google.api_core.exceptions import ResourceExhausted, NotFound


# Usage
#   pip install google-generativeai pillow
#   export GOOGLE_API_KEY=your_key
#   python3 scripts/creative_generator.py


API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("Set GOOGLE_API_KEY or GEMINI_API_KEY in your environment")
genai.configure(api_key=API_KEY)

TEXT_MODEL = os.getenv("TEXT_MODEL", "gemini-1.5-flash")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gemini-2.5-flash-image-preview")


def call_api_with_retry(api_call_func, api_name="API", max_retries=5, initial_delay=4):
    retries, delay = 0, initial_delay
    while retries < max_retries:
        try:
            return api_call_func()
        except ResourceExhausted as e:
            retries += 1
            if retries >= max_retries:
                raise
            time.sleep(delay + random.uniform(0, 1.25))
            delay *= 2


def extract_text(response):
    return getattr(response, "text", None)


def coerce_json(raw_text: str):
    if not raw_text:
        raise RuntimeError("No text to parse into JSON.")
    t = raw_text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        t = t.replace("json\n", "").strip()
    return json.loads(t)


# Minimal content safety to avoid illegal/harmful content
PROHIBITED = {"gun", "revolver", "weapon", "explosive", "drugs", "thief", "robber", "without licence", "without license"}


def is_safe_5ps(fiveps: Dict[str, str]) -> bool:
    text = " ".join([str(v).lower() for v in fiveps.values()])
    return not any(term in text for term in PROHIBITED)


def generate_prompt_from_5ps(fiveps: Dict[str, str]) -> str:
    if not is_safe_5ps(fiveps):
        raise ValueError("5Ps contain prohibited/illegal content. Provide a safe, legal product.")

    system_instructions = (
        "You are a creative director. Generate an image prompt based on the 5Ps. "
        "Return ONLY JSON: {\\"prompt\\":\\"...\\", \\"negative\\\":\\"...\\", \\"style\\\":\\"...\\", "
        "\\"aspect_ratio\\\":\\"1:1|4:5|3:4|16:9\\", \\"safety\\\":\\"...\\"}. No markdown."
    )

    text_model = genai.GenerativeModel(model_name=TEXT_MODEL, system_instruction=system_instructions)
    gen_cfg = genai.GenerationConfig(response_mime_type="application/json", max_output_tokens=600, temperature=0.4)

    def _call():
        return text_model.generate_content(json.dumps(fiveps), generation_config=gen_cfg)

    resp = call_api_with_retry(_call, api_name="Text Model")
    brief = coerce_json(extract_text(resp))
    prompt = brief.get("prompt")
    if not prompt:
        raise RuntimeError(f"No 'prompt' in brief: {brief}")
    return prompt


def generate_image_from_prompt(prompt: str, out_path: str = "creative.png") -> str:
    image_model = genai.GenerativeModel(IMAGE_MODEL)

    def _call():
        return image_model.generate_content(prompt)

    try:
        resp = call_api_with_retry(_call, api_name="Image Model")
    except NotFound as e:
        raise RuntimeError(f"Image model not found or unavailable: {IMAGE_MODEL}") from e

    try:
        cand = resp.candidates[0]
        parts = getattr(cand.content, "parts", [])
        image_part = next(p for p in parts if getattr(getattr(p, "inline_data", None), "mime_type", "").startswith("image/"))
        data = image_part.inline_data.data
        if isinstance(data, str):
            data = data.encode("latin1")
        Image.open(io.BytesIO(data)).save(out_path)
        return out_path
    except (StopIteration, IndexError, AttributeError, UnidentifiedImageError) as e:
        raise RuntimeError(f"Could not extract an image from the response. {e}\nFull response: {resp}")


def _prompt_if_missing(args):
    def ask(name, default=""):
        val = getattr(args, name)
        if val:
            return val
        env_key = {
            "product": "P_PRODUCT",
            "price": "P_PRICE",
            "place": "P_PLACE",
            "promotion": "P_PROMO",
            "people": "P_PEOPLE",
        }[name]
        val = os.getenv(env_key)
        if val:
            return val
        return input(f"Enter {name.capitalize()}{' ['+default+']' if default else ''}: ") or default

    product = ask("product", "Energy Drink X")
    price = ask("price", "$2.49")
    place = ask("place", "D2C + retail in Tier-1 cities")
    promotion = ask("promotion", "IG influencers + posters: 'Calm Focus. Clean Energy.'")
    people = ask("people", "young professionals and students")
    return {
        "product": product,
        "price": price,
        "place": place,
        "promotion": promotion,
        "people": people,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate creative image via Gemini using 5Ps")
    parser.add_argument("--product")
    parser.add_argument("--price")
    parser.add_argument("--place")
    parser.add_argument("--promotion")
    parser.add_argument("--people")
    parser.add_argument("--out", default="creative.png", help="Output image path")
    parser.add_argument("--json", help="Path to JSON file with {product,price,place,promotion,people}")
    args = parser.parse_args()

    if args.json:
        with open(args.json, "r") as f:
            fiveps = json.load(f)
    else:
        fiveps = _prompt_if_missing(args)

    print("Step 1: Generating creative brief from 5Ps...")
    prompt = generate_prompt_from_5ps(fiveps)
    print("Prompt:\n", prompt)

    print("\nStep 2: Generating image from prompt...")
    out = generate_image_from_prompt(prompt, out_path=args.out)
    print(f"\n✅ Success! Image saved as {out}")


if __name__ == "__main__":
    main()
