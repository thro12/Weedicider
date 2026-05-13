"""
WeedICider – Smart Weed Detection System
Flask backend serving the YOLOv8 model for crop/weed detection.
Full dashboard with history, recommendations, and analytics.
"""

import os
import io
import base64
import uuid
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock

from flask import Flask, render_template, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from PIL import Image
import numpy as np
import cv2

from ultralytics import YOLO
try:
    from fpdf import FPDF
except ImportError:
    FPDF = None

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "Combined_Dataset_Yolov8_best.pt"
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
HISTORY_FILE = BASE_DIR / "history.json"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

history_lock = Lock()

detection_history = []

# ──────────────────────────────────────────────
# Load model once at startup
# ──────────────────────────────────────────────
print(f"[WeedICider] Loading model from {MODEL_PATH} …")
model = YOLO(str(MODEL_PATH))
CLASS_NAMES = model.names  # {0: 'crop', 1: 'weed'}
print(f"[WeedICider] Model loaded. Classes: {CLASS_NAMES}")

# Colour palette per class  (RGB)
CLASS_COLORS = {
    0: (34, 197, 94),   # green  – crop
    1: (239, 68, 68),   # red    – weed
}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_history() -> list:
    if HISTORY_FILE.exists():
        try:
            data = json.loads(HISTORY_FILE.read_text())
            if isinstance(data, list):
                return data
        except Exception:
            pass
    return []


def save_history() -> None:
    with history_lock:
        HISTORY_FILE.write_text(json.dumps(detection_history, indent=2))


def compute_stats() -> dict:
    total_scans = len(detection_history)
    total_weeds = sum(e.get('weeds', 0) for e in detection_history)
    total_crops = sum(e.get('crops', 0) for e in detection_history)
    avg_conf = round(
        sum(e.get('confidence', 0) for e in detection_history) / max(len(detection_history), 1), 1
    )
    return {
        'total_scans': total_scans,
        'total_weeds': total_weeds,
        'total_crops': total_crops,
        'avg_confidence': avg_conf,
    }


def get_field_status(weed_pct: float, total: int) -> str:
    if total == 0:
        return 'No plants'
    if weed_pct > 50:
        return 'High Risk'
    if weed_pct > 20:
        return 'Moderate'
    return 'Healthy'


def build_report(scan_entry: dict) -> dict:
    weed_pct = scan_entry.get('weed_pct', 0)
    crop_pct = scan_entry.get('crop_pct', 0)
    weeds = scan_entry.get('weeds', 0)
    crops = scan_entry.get('crops', 0)
    total = scan_entry.get('total', 0)
    confidence = scan_entry.get('confidence', 0)
    risk_level = scan_entry.get('risk_level', 'None')

    return {
        'detection_summary': {
            'total_crops': crops,
            'total_weeds': weeds,
            'confidence': confidence,
            'risk_level': risk_level,
            'weed_ratio': f"{weed_pct}%",
            'crop_ratio': f"{crop_pct}%",
        },
        'crop_health_analysis': {
            'condition': 'Healthy' if weed_pct < 25 else 'Stable' if weed_pct < 40 else 'Stressed',
            'crop_density': 'Optimal' if crops >= weeds else 'Sparse',
            'healthy_crop_ratio': f"{crop_pct}%",
            'notes': (
                'Crop growth is stable and competition is low.'
                if weed_pct < 30 else
                'Crops are under moderate stress from weeds.'
                if weed_pct < 50 else
                'Crop performance is at risk; clear weeds quickly.'
            ),
        },
        'weed_infestation_analysis': {
            'severity': 'Low' if weed_pct < 20 else 'Moderate' if weed_pct < 50 else 'High',
            'weed_spread': (
                'Weeds appear limited and patchy.'
                if weed_pct < 20 else
                'Weeds are spreading across several zones.'
                if weed_pct < 50 else
                'Widespread infestation requiring immediate action.'
            ),
            'affected_zones': 'Localized' if weed_pct < 30 else 'Multiple rows' if weed_pct < 60 else 'Field-wide',
            'competition_risk': (
                'Low competition.'
                if weed_pct < 20 else
                'Moderate competition, monitor crop health.'
                if weed_pct < 50 else
                'High competition, intervene now.'
            ),
        },
        'recommendations': [
            {
                'title': 'Weed removal',
                'detail': 'Remove identified weeds manually or with targeted herbicide in affected areas.',
            },
            {
                'title': 'Irrigation advice',
                'detail': 'Maintain regular irrigation to help crops outcompete weeds and reduce stress.',
            },
            {
                'title': 'Herbicide suggestions',
                'detail': 'Use selective herbicide on dense weed clusters and avoid crop contact.',
            },
            {
                'title': 'Monitoring advice',
                'detail': 'Scan fields weekly to catch regrowth early and adjust actions quickly.',
            },
        ],
        'ai_insights': {
            'explanation': 'YOLOv8 analyzes every image patch for plant structure, color, and texture to separate crops from weeds.',
            'accuracy': 'Predictions are derived from model confidence scores and bounding box quality.',
            'confidence_scoring': 'Confidence percentages reflect how strongly the model recognizes each detection.',
        },
        'field_status': get_field_status(weed_pct, total),
    }


def make_scan_entry_report(entry: dict) -> dict:
    report = build_report(entry)
    entry['report'] = report
    return report


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """Accept an image, run YOLOv8, return annotated image + metrics."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use JPG / PNG / WEBP."}), 400

    confidence = float(request.form.get("confidence", 0.25)) if request.form.get("confidence") else 0.25
    imgsz = int(request.form.get("imgsz", 640)) if request.form.get("imgsz") else 640

    # Read image
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        return jsonify({"error": "Could not decode image"}), 400

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]

    # Save original as base64 thumbnail for history
    orig_pil = Image.fromarray(img_rgb)
    orig_buf = io.BytesIO()
    orig_pil_thumb = orig_pil.copy()
    orig_pil_thumb.thumbnail((200, 200))
    orig_pil_thumb.save(orig_buf, format="JPEG", quality=70)
    orig_b64_thumb = base64.b64encode(orig_buf.getvalue()).decode("utf-8")

    # ── Run inference ─────────────────────────
    start_time = time.time()
    results = model.predict(img_rgb, imgsz=imgsz, conf=confidence, verbose=False)
    inference_time = round((time.time() - start_time) * 1000, 1)
    result = results[0]

    detections = []
    crop_count = 0
    weed_count = 0
    confidences = []

    for box in result.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        label = CLASS_NAMES[cls_id]
        confidences.append(conf)

        if label == "crop":
            crop_count += 1
        else:
            weed_count += 1

        detections.append({
            "class": label,
            "confidence": round(conf * 100, 1),
            "bbox": [round(x1), round(y1), round(x2), round(y2)],
        })

        # Draw on image
        color = CLASS_COLORS.get(cls_id, (255, 255, 255))
        thickness = max(2, int(min(h, w) / 200))
        cv2.rectangle(img_rgb, (int(x1), int(y1)), (int(x2), int(y2)), color, thickness)

        # Label background
        text = f"{label} {conf:.0%}"
        font_scale = max(0.5, min(h, w) / 800)
        (tw, th_text), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
        cv2.rectangle(img_rgb, (int(x1), int(y1) - th_text - 10), (int(x1) + tw + 6, int(y1)), color, -1)
        cv2.putText(img_rgb, text, (int(x1) + 3, int(y1) - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 2, cv2.LINE_AA)

    # ── Encode result image as base64 ────────
    result_pil = Image.fromarray(img_rgb)
    buf = io.BytesIO()
    result_pil.save(buf, format="JPEG", quality=92)
    b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")

    # Result thumbnail for history
    result_thumb_buf = io.BytesIO()
    result_pil_thumb = result_pil.copy()
    result_pil_thumb.thumbnail((200, 200))
    result_pil_thumb.save(result_thumb_buf, format="JPEG", quality=70)
    result_b64_thumb = base64.b64encode(result_thumb_buf.getvalue()).decode("utf-8")

    total = crop_count + weed_count
    avg_conf = round(sum(confidences) / max(len(confidences), 1) * 100, 1)

    if total > 0:
        weed_pct = round(weed_count / total * 100, 1)
        crop_pct = round(crop_count / total * 100, 1)
        if weed_count == 0:
            verdict = "✅ Field is clean — no weeds detected!"
            risk_level = "Low"
        elif weed_pct > 50:
            verdict = "🚨 High weed infestation — immediate action recommended!"
            risk_level = "High"
        elif weed_pct > 20:
            verdict = "⚠️ Moderate weed presence — consider targeted removal."
            risk_level = "Medium"
        else:
            verdict = "🟡 Low weed presence — monitor and maintain."
            risk_level = "Low"
    else:
        weed_pct = 0
        crop_pct = 0
        verdict = "No plants detected in this image."
        risk_level = "None"

    # Add to history
    scan_entry = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.now().isoformat(),
        "time_ago": "Just now",
        "filename": file.filename or "uploaded_image",
        "crops": crop_count,
        "weeds": weed_count,
        "total": total,
        "confidence": avg_conf,
        "risk_level": risk_level,
        "crop_pct": crop_pct,
        "weed_pct": weed_pct,
        "original_thumb": f"data:image/jpeg;base64,{orig_b64_thumb}",
        "result_thumb": f"data:image/jpeg;base64,{result_b64_thumb}",
    }
    make_scan_entry_report(scan_entry)
    detection_history.insert(0, scan_entry)
    if len(detection_history) > 50:
        detection_history.pop()
    save_history()

    recommendations = scan_entry['report']['recommendations']

    return jsonify({
        "image": f"data:image/jpeg;base64,{b64_img}",
        "original_thumb": scan_entry["original_thumb"],
        "detections": detections,
        "metrics": {
            "total": total,
            "crops": crop_count,
            "weeds": weed_count,
            "crop_pct": crop_pct,
            "weed_pct": weed_pct,
            "avg_confidence": avg_conf,
            "inference_time_ms": inference_time,
            "risk_level": risk_level,
        },
        "summary": verdict,
        "recommendations": recommendations,
        "report": scan_entry["report"],
        "image_size": {"width": w, "height": h},
        "scan_id": scan_entry["id"],
    })


def generate_recommendations(crops, weeds, weed_pct, risk_level):
    """Generate AI-style recommendations based on detections."""
    recs = []
    if weeds > 0:
        recs.append({
            "icon": "🌿",
            "text": f"Remove {weeds} weed(s) detected in the scan area to prevent crop competition."
        })
    if weed_pct > 30:
        recs.append({
            "icon": "⚡",
            "text": "Consider applying targeted herbicide in weed-dense zones."
        })
    if weed_pct > 50:
        recs.append({
            "icon": "🚜",
            "text": "Mechanical weeding recommended — weed infestation is severe."
        })
    if crops > 0 and weeds == 0:
        recs.append({
            "icon": "✅",
            "text": "Crops look healthy! Maintain current farming practices."
        })
    if crops > 0:
        recs.append({
            "icon": "💧",
            "text": "Maintain proper irrigation to promote healthy crop growth."
        })
    recs.append({
        "icon": "📊",
        "text": "Monitor field regularly — scan weekly for early weed detection."
    })
    if risk_level == "Medium" or risk_level == "High":
        recs.append({
            "icon": "🧪",
            "text": "Use organic mulch between crop rows to suppress weed growth."
        })
    return recs[:5]


@app.route("/sample-images")
def sample_images():
    """Return a list of sample test images the user can try."""
    test_dir = BASE_DIR / "test" / "images"
    samples = []
    for f in sorted(test_dir.iterdir()):
        if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            samples.append(f.name)
        if len(samples) >= 16:
            break
    return jsonify(samples)


@app.route("/test-image/<filename>")
def serve_test_image(filename):
    """Serve a test image for the sample gallery."""
    return send_from_directory(str(BASE_DIR / "test" / "images"), filename)


@app.route("/history")
def get_history():
    """Return detection history."""
    now = datetime.now()
    for entry in detection_history:
        ts = datetime.fromisoformat(entry["timestamp"])
        delta = now - ts
        if delta.seconds < 60:
            entry["time_ago"] = "Just now"
        elif delta.seconds < 3600:
            entry["time_ago"] = f"{delta.seconds // 60} min ago"
        elif delta.seconds < 86400:
            entry["time_ago"] = f"{delta.seconds // 3600} hour(s) ago"
        else:
            entry["time_ago"] = f"{delta.days} day(s) ago"
    return jsonify(detection_history[:50])


@app.route("/stats")
def get_stats():
    """Return cumulative dashboard stats."""
    return jsonify(compute_stats())


@app.route("/analytics")
def get_analytics():
    """Return trend data for analytics."""
    timeline = [
        {
            'id': entry['id'],
            'timestamp': entry['timestamp'],
            'time_ago': entry.get('time_ago', ''),
            'weeds': entry.get('weeds', 0),
            'crops': entry.get('crops', 0),
            'total': entry.get('total', 0),
            'confidence': entry.get('confidence', 0),
            'risk_level': entry.get('risk_level', 'None'),
        }
        for entry in detection_history
    ]
    return jsonify({
        'timeline': timeline,
        'summary': compute_stats(),
    })


@app.route("/report/<scan_id>")
def report(scan_id):
    """Return the detailed report for a specific scan."""
    entry = next((e for e in detection_history if e['id'] == scan_id), None)
    if not entry:
        return jsonify({'error': 'Scan not found'}), 404
    return jsonify(entry.get('report', build_report(entry)))


@app.route("/backend-status")
def backend_status():
    """Return backend and model status."""
    return jsonify({
        'status': 'ready',
        'model_loaded': True,
        'model_path': str(MODEL_PATH.name),
        'loaded_classes': list(CLASS_NAMES.values()),
        'history_count': len(detection_history),
        'server_time': datetime.now().isoformat(),
    })


@app.route("/export-report/<scan_id>")
def export_report(scan_id):
    """Generate a PDF report for the selected scan."""
    entry = next((e for e in detection_history if e['id'] == scan_id), None)
    if not entry:
        return jsonify({'error': 'Scan not found'}), 404

    if FPDF is None:
        return jsonify({'error': 'PDF export unavailable. Install fpdf in backend.'}), 500

    report_data = entry.get('report', build_report(entry))
    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(34, 197, 94)
    pdf.cell(0, 12, 'WeedICider AI Detection Report', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(215, 245, 211)
    pdf.cell(0, 6, f"Scan ID: {entry['id']}", ln=True)
    pdf.cell(0, 6, f"Timestamp: {entry['timestamp']}", ln=True)
    pdf.ln(6)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'Detection Summary', ln=True)
    pdf.set_font('Helvetica', '', 11)
    for key, value in report_data['detection_summary'].items():
        pdf.cell(0, 6, f"{key.replace('_', ' ').title()}: {value}", ln=True)
    pdf.ln(4)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'Field Status', ln=True)
    pdf.set_font('Helvetica', '', 11)
    pdf.cell(0, 6, report_data['field_status'], ln=True)
    pdf.ln(4)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'Recommendations', ln=True)
    pdf.set_font('Helvetica', '', 11)
    for item in report_data['recommendations']:
        pdf.multi_cell(0, 6, f"• {item['title']}: {item['detail']}")
    pdf.ln(4)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, 'AI Insights', ln=True)
    pdf.set_font('Helvetica', '', 11)
    pdf.multi_cell(0, 6, report_data['ai_insights']['explanation'])
    pdf.multi_cell(0, 6, report_data['ai_insights']['accuracy'])
    pdf.multi_cell(0, 6, report_data['ai_insights']['confidence_scoring'])

    output = io.BytesIO()
    pdf.output(output)
    output.seek(0)

    response = make_response(output.read())
    response.headers.set('Content-Type', 'application/pdf')
    response.headers.set('Content-Disposition', f"attachment; filename=weedicider-report-{entry['id']}.pdf")
    return response


@app.route("/model-info")
def model_info():
    """Return model metadata."""
    return jsonify({
        "name": "WeedICider YOLOv8s",
        "architecture": "YOLOv8-small",
        "classes": list(CLASS_NAMES.values()),
        "input_size": 640,
        "dataset": "SMART_WEED_DETECTION_SYSTEM v6",
        "images_trained": 1056,
        "final_mAP50": 42.1,
        "final_mAP50_95": 23.6,
    })


# ──────────────────────────────────────────────
if __name__ == "__main__":
    detection_history.extend(load_history())
    app.run(host="0.0.0.0", port=5002, debug=True)
