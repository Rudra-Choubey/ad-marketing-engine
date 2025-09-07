Backend AI providers: Hugging Face (default) or Gemini

Quick switch via environment:
- `AI_PROVIDER=hf` (default) uses HF text (flan-t5) + local Stable Diffusion image.
- `AI_PROVIDER=gemini` uses Gemini for text; images via Google Images API (if enabled) or falls back to local SD.

Environment variables:
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_TEXT_MODEL` (e.g., `gemini-1.5-flash` or `gemini-1.5-pro`)
- `GEMINI_IMAGE_MODEL` (optional, e.g., `imagen-3.0` or `imagen-3.0-generate`)
- `HF_TEXT_MODEL` (default: `google/flan-t5-small`)

Endpoints of interest:
- `POST /generate` – generates creatives using the selected provider
- `POST /localize` – transcreates per region
- `GET /config` – returns current AI provider and model wiring (no secrets)

Notes on Gemini Images:
- Requires Images API access and the newer `google-genai` Python SDK (`pip install google-genai`).
- If unavailable, image generation falls back to local Stable Diffusion and serves files under `/static`.
