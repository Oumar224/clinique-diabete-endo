import base64
import json
import os
import sys
import time

import google.generativeai as genai

IMAGE_PATH = "/home/oumar/projects/clinique-diabete-endo/intelligent_resources/template_ordonance.jpeg"
OUTPUT_PATH = "/home/oumar/projects/clinique-diabete-endo/intelligent_resources/design_extraction.json"

API_KEY = os.environ.get("GOOGLE_API_KEY")
if not API_KEY:
    print("ERROR: GOOGLE_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

with open(IMAGE_PATH, "rb") as f:
    image_data = base64.b64encode(f.read()).decode("utf-8")

mime_type = "image/jpeg"

PROMPT = """You are a precise design extraction engine. Analyze this French prescription template (CERFA 14465*01 - ordonnance bizone) and extract ALL visual design details in a structured JSON format.

Return ONLY valid JSON with these keys:

1. "page": dimensions, aspect ratio (the image is 925x1280 pixels)
2. "zones": array of visual blocks with:
   - "name": descriptive name
   - "type": header/doctor_info/patient_info/zone1/zone2/footer/separator
   - "position": {x, y, width, height} as percentages (0-100)
3. "header": { logo_position, republic_title, hospital_name, contact_info }
4. "doctor_info": layout details, fields, labels
5. "patient_info": layout details, fields, labels
6. "bizone_prescription_area": {
     "zone1": { position, size, border, inner_structure, table_columns, headers },
     "zone2": { position, size, border, inner_structure, table_columns, headers },
     "separator": { position, style }
   }
7. "table_structures": details of any tables inside each zone (rows, columns, headers)
8. "footer": signature area, date, cachet fields
9. "colors": all colors detected as hex codes with their locations
10. "typography": fonts, sizes, styles, weights by zone
11. "borders_and_lines": all lines, borders, separators with positions and styles
12. "checkbox_positions": any checkboxes with positions
13. "decorative_elements": any decorative elements detected

For every positional value, use percentage (0-100) of total width/height. Be extremely precise — measure margins, padding, and spacing. Describe the visual hierarchy between zones."""

models_to_try = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
]

def call_model(model_name):
    model = genai.GenerativeModel(model_name)
    print(f"Trying model: {model_name}...", flush=True)
    response = model.generate_content([
        PROMPT,
        {"mime_type": mime_type, "data": image_data}
    ])
    return response

parsed = None
last_error = None

for model_name in models_to_try:
    for attempt in range(3):
        try:
            response = call_model(model_name)
            print("Response received. Parsing...", flush=True)

            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            try:
                parsed = json.loads(text)
            except json.JSONDecodeError as e:
                print(f"WARNING: Could not parse JSON: {e}", file=sys.stderr)
                print("Saving raw response as fallback...", flush=True)
                parsed = {"raw_response": text}

            break
        except Exception as e:
            err_str = str(e)
            last_error = err_str
            print(f"Model {model_name} attempt {attempt+1} failed: {type(e).__name__}", flush=True)
            if "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                # Parse retry delay
                delay = 30
                for line in err_str.split("\n"):
                    if "retry_delay" in line or "Please retry in" in line:
                        import re
                        m = re.search(r"(\d+(?:\.\d+)?)", line)
                        if m:
                            delay = float(m.group(1)) + 5
                            break
                if attempt < 2:
                    print(f"Waiting {delay:.0f}s before retry...", flush=True)
                    time.sleep(delay)
                else:
                    print(f"Giving up on {model_name} after 3 attempts.", flush=True)
            else:
                if attempt < 2:
                    print(f"Will retry in 5s...", flush=True)
                    time.sleep(5)
                else:
                    print(f"Giving up on {model_name} after 3 attempts.", flush=True)
    if parsed is not None:
        break

if parsed is None:
    print(f"ERROR: All models failed. Last error: {last_error}", file=sys.stderr)
    sys.exit(1)

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(parsed, f, indent=2, ensure_ascii=False)

print(f"Design extraction saved to {OUTPUT_PATH}", flush=True)
print(json.dumps(parsed, indent=2, ensure_ascii=False))
