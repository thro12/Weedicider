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
import logging
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from urllib.parse import quote

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
DIST_DIR = BASE_DIR / "dashboard-ui" / "dist"
MODEL_PATH = BASE_DIR / "Combined_Dataset_Yolov8_best.pt"
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
HISTORY_FILE = BASE_DIR / "history.json"
METRICS_FILE = BASE_DIR / "metrics.json"
HISTORY_LIMIT = 500
DEFAULT_PROFILE_ID = "default"
DEFAULT_PROFILE_NAME = "Sumanth"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}

CURATED_SAMPLE_IMAGES = [
    # Banana-field / crop-focused images from the trained dataset.
    "train/images/IMG20251218152132_jpg.rf.cb295b57d72216bf447871bd18baf5b7.jpg",
    "train/images/IMG20251218152154_jpg.rf.2a4cac74ccb2816a78176f010ba3c60b.jpg",
    "train/images/IMG20251218152214_jpg.rf.565d435002f6f89a8c82f210e264eb55.jpg",
    "train/images/IMG20251218152229_jpg.rf.30959203bb89eceea554d5898bdf590a.jpg",
    "train/images/IMG20251218152236_jpg.rf.0cfa70094c44114f31f266520a8c63d4.jpg",
    "train/images/IMG20251218152255_jpg.rf.bf29b8dae93b66996059ef24c68dfa37.jpg",
    "train/images/IMG20251218152306_jpg.rf.75388bffc35315c05c92f4a48442e324.jpg",
    "train/images/IMG20251218152311_jpg.rf.fde87566fcfbafc348ee6fbfa7654fd1.jpg",
    "train/images/IMG20251218152814_jpg.rf.d5ceaa5290dd18c281c9807f82026687.jpg",
    "train/images/IMG20251218152857_jpg.rf.69ea28155aa986661c8d33265f110b4a.jpg",
    "train/images/img113_jpg.rf.4592cdb90fe010c714a1c908676e8a1b.jpg",
    "train/images/img114_jpg.rf.0d12c8021c22bac9986e3229d8268cbc.jpg",
    "train/images/img118_jpg.rf.5ba9e1692e43dbfa51d5b37c1b761a61.jpg",
    "train/images/img123_jpg.rf.58850b07efda43e6e78bf146a3c0c989.jpg",
    "train/images/img125_jpg.rf.a3795e79a85a710ede9543e03178583b.jpg",
    "train/images/img127_jpg.rf.4e442be0745d08ed6cde6a69a28509dc.jpg",
    "train/images/img138_jpg.rf.faf7a165838673f484313f51fc742242.jpg",
    "train/images/img22_jpg.rf.182459ae3b97dbc8669f2f5bd5eaa593.jpg",
    "train/images/img46_jpg.rf.86913741d615675dbd689d6f638540e0.jpg",
    "train/images/download-12-_jpg.rf.3679aed8267511bc24fb055802088895.jpg",
    # Weed-heavy examples for comparison.
    "train/images/weed_0_4388_jpeg.rf.2eaf42a08b9ca656a4fbc9b2d3f68307.jpg",
    "train/images/weed_0_657_jpeg.rf.6abc8e1e05e511ec46d29ab2dde5c2ff.jpg",
    "train/images/Parthenium_hysterophorus_43_jpg.rf.2b1c4c8b3d44bd48b8753368206a4321.jpg",
    "train/images/Cryptostegia_grandiflora_48_jpg.rf.484f1d3f1da1396bad19a0015c1b3752.jpg",
    "test/images/weed_0_6783_jpeg.rf.3705fcae32d6f126c5269d9ee5f9ec2f.jpg",
]

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

@app.after_request
def add_default_headers(response):
    response.headers.setdefault('Access-Control-Allow-Origin', '*')
    response.headers.setdefault('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.setdefault('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response

@app.errorhandler(Exception)
def handle_api_exception(error):
    if request.path.startswith('/api/'):
        status_code = getattr(error, 'code', 500)
        return jsonify({'error': str(error)}), status_code
    raise error

history_lock = Lock()

detection_history = []
history_loaded = False
scan_metrics = {}
metrics_loaded = False

# ──────────────────────────────────────────────
# Load model once at startup
# ──────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"[WeedICider] Loading model from {MODEL_PATH} …")
model = YOLO(str(MODEL_PATH))
CLASS_NAMES = model.names  # {0: 'crop', 1: 'weed'}
logger.info(f"[WeedICider] Model loaded. Classes: {CLASS_NAMES}")

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


def hydrate_history(force: bool = False) -> None:
    """Load persisted scans into memory for every server launch mode."""
    global history_loaded
    with history_lock:
        if history_loaded and not force:
            return
        persisted = load_history()
        detection_history.clear()
        detection_history.extend(persisted)
        history_loaded = True


def ensure_history_loaded() -> None:
    if not history_loaded or (not detection_history and HISTORY_FILE.exists()):
        hydrate_history(force=not detection_history)


def save_history() -> None:
    with history_lock:
        HISTORY_FILE.write_text(json.dumps(detection_history, indent=2))


def default_metrics() -> dict:
    return {
        'total_scans': 0,
        'total_weeds': 0,
        'total_crops': 0,
        'confidence_sum': 0,
        'confidence_count': 0,
    }


def metrics_from_history() -> dict:
    ensure_history_loaded()
    return metrics_from_entries(detection_history)


def get_profile_id() -> str | None:
    profile_id = request.args.get('profile_id') or request.form.get('profile_id')
    if not profile_id or profile_id == 'all':
        return None
    return profile_id


def normalize_profile_id(profile_id: str | None) -> str:
    return profile_id or DEFAULT_PROFILE_ID


def entry_profile_id(entry: dict) -> str:
    return normalize_profile_id(entry.get('profile_id'))


def filter_history(profile_id: str | None = None) -> list:
    ensure_history_loaded()
    if not profile_id:
        return detection_history
    return [entry for entry in detection_history if entry_profile_id(entry) == profile_id]


def metrics_from_entries(entries: list) -> dict:
    return {
        'total_scans': len(entries),
        'total_weeds': sum(e.get('weeds', 0) for e in entries),
        'total_crops': sum(e.get('crops', 0) for e in entries),
        'confidence_sum': sum(e.get('confidence', 0) for e in entries),
        'confidence_count': len(entries),
    }


def load_metrics() -> dict:
    if METRICS_FILE.exists():
        try:
            data = json.loads(METRICS_FILE.read_text())
            if isinstance(data, dict):
                metrics = default_metrics()
                metrics.update({
                    'total_scans': int(data.get('total_scans', 0)),
                    'total_weeds': int(data.get('total_weeds', 0)),
                    'total_crops': int(data.get('total_crops', 0)),
                    'confidence_sum': float(data.get('confidence_sum', 0)),
                    'confidence_count': int(data.get('confidence_count', 0)),
                })
                return metrics
        except Exception:
            pass
    return metrics_from_history()


def ensure_metrics_loaded() -> None:
    global metrics_loaded, scan_metrics
    if metrics_loaded:
        return
    scan_metrics = load_metrics()
    metrics_loaded = True
    save_metrics()


def save_metrics() -> None:
    METRICS_FILE.write_text(json.dumps(scan_metrics or default_metrics(), indent=2))


def update_metrics(scan_entry: dict) -> None:
    ensure_metrics_loaded()
    scan_metrics['total_scans'] = scan_metrics.get('total_scans', 0) + 1
    scan_metrics['total_weeds'] = scan_metrics.get('total_weeds', 0) + scan_entry.get('weeds', 0)
    scan_metrics['total_crops'] = scan_metrics.get('total_crops', 0) + scan_entry.get('crops', 0)
    scan_metrics['confidence_sum'] = scan_metrics.get('confidence_sum', 0) + scan_entry.get('confidence', 0)
    scan_metrics['confidence_count'] = scan_metrics.get('confidence_count', 0) + 1
    save_metrics()


def reset_scan_data(profile_id: str | None = None) -> dict:
    global history_loaded, metrics_loaded, scan_metrics
    ensure_history_loaded()
    with history_lock:
        if profile_id:
            detection_history[:] = [
                entry for entry in detection_history
                if entry_profile_id(entry) != profile_id
            ]
        else:
            detection_history.clear()
        HISTORY_FILE.write_text(json.dumps([], indent=2))
        if detection_history:
            HISTORY_FILE.write_text(json.dumps(detection_history, indent=2))
        history_loaded = True
    scan_metrics = metrics_from_entries(detection_history)
    metrics_loaded = True
    save_metrics()
    return compute_stats(profile_id)


def sync_metrics_from_history() -> None:
    global metrics_loaded, scan_metrics
    scan_metrics = metrics_from_entries(detection_history)
    metrics_loaded = True
    save_metrics()


def compute_stats(profile_id: str | None = None) -> dict:
    metrics = metrics_from_entries(filter_history(profile_id))
    total_scans = metrics.get('total_scans', 0)
    total_weeds = metrics.get('total_weeds', 0)
    total_crops = metrics.get('total_crops', 0)
    confidence_count = metrics.get('confidence_count', 0)
    avg_conf = round(
        metrics.get('confidence_sum', 0) / max(confidence_count, 1), 1
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
    confidence_ratio = confidence / 100 if confidence > 1 else confidence
    risk_level = scan_entry.get('risk_level', 'None')

    # Calculate crop vigor score (0-100)
    crop_vigor = max(0, min(100, int(crop_pct * 0.7 + confidence_ratio * 30)))
    
    # Calculate yield impact prediction
    yield_loss = min(100, int(weed_pct * 1.5))
    
    # Estimate water stress (higher weed pressure = higher stress)
    water_stress = 'Low' if weed_pct < 20 else 'Moderate' if weed_pct < 50 else 'High'
    
    # Nutritional status estimation
    nutrition_status = 'Excellent' if crop_pct > 80 else 'Good' if crop_pct > 60 else 'Fair' if crop_pct > 40 else 'Poor'
    
    # Disease risk based on crop density and stress
    disease_risk = 'Low' if (crop_pct > 70 and weed_pct < 20) else 'Moderate' if crop_pct > 50 else 'High'
    
    # Estimated damage cost (assuming $500 per 10% yield loss)
    estimated_damage = int((yield_loss / 10) * 500)

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
            'crop_vigor_score': crop_vigor,
            'yield_loss_prediction': yield_loss,
            'water_stress_level': water_stress,
            'nutritional_status': nutrition_status,
            'disease_risk': disease_risk,
            'estimated_damage_cost': estimated_damage,
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


def sanitize_pdf_text(value) -> str:
    """Keep generated fallback PDFs compatible with built-in PDF fonts."""
    text = str(value)
    replacements = {
        '•': '-',
        '–': '-',
        '—': '-',
        '“': '"',
        '”': '"',
        '’': "'",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode('latin-1', 'replace').decode('latin-1')


def wrap_pdf_text(text: str, width: int = 92) -> list[str]:
    words = sanitize_pdf_text(text).split()
    lines = []
    current = ''
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or ['']


def escape_pdf_text(text: str) -> str:
    return sanitize_pdf_text(text).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def build_simple_pdf(title: str, lines: list[str]) -> bytes:
    """Small dependency-free PDF generator used when fpdf is unavailable."""
    pages = []
    page_lines = []
    for line in lines:
        wrapped = wrap_pdf_text(line)
        if len(page_lines) + len(wrapped) > 46:
            pages.append(page_lines)
            page_lines = []
        page_lines.extend(wrapped)
    if page_lines:
        pages.append(page_lines)
    if not pages:
        pages = [[]]

    objects: list[bytes] = []

    def add_object(content: bytes) -> int:
        objects.append(content)
        return len(objects)

    font_obj = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_refs = []
    content_refs = []

    for page_index, page in enumerate(pages, start=1):
        stream_lines = [
            "BT",
            "/F1 18 Tf",
            "50 790 Td",
            f"({escape_pdf_text(title)}) Tj",
            "/F1 10 Tf",
            "0 -18 Td",
            f"(Page {page_index} of {len(pages)}) Tj",
            "/F1 11 Tf",
            "0 -24 Td",
            "14 TL",
        ]
        for line in page:
            stream_lines.append(f"({escape_pdf_text(line)}) Tj")
            stream_lines.append("T*")
        stream_lines.append("ET")
        stream = "\n".join(stream_lines).encode('latin-1', 'replace')
        content_obj = add_object(
            b"<< /Length " + str(len(stream)).encode('ascii') + b" >>\nstream\n" + stream + b"\nendstream"
        )
        content_refs.append(content_obj)
        page_refs.append(None)

    pages_obj_number = len(objects) + len(pages) + 1
    for index, content_obj in enumerate(content_refs):
        page_refs[index] = add_object(
            f"<< /Type /Page /Parent {pages_obj_number} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_obj} 0 R >> >> /Contents {content_obj} 0 R >>".encode('ascii')
        )

    kids = " ".join(f"{ref} 0 R" for ref in page_refs)
    pages_obj = add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_refs)} >>".encode('ascii'))
    catalog_obj = add_object(f"<< /Type /Catalog /Pages {pages_obj} 0 R >>".encode('ascii'))

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode('ascii'))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_start = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode('ascii'))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode('ascii'))
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_obj} 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n".encode('ascii')
    )
    return bytes(output)


def report_lines(entry: dict, report_data: dict) -> list[str]:
    lines = [
        f"Scan ID: {entry['id']}",
        f"Timestamp: {entry['timestamp']}",
        f"Filename: {entry.get('filename', 'uploaded_image')}",
        "",
        "Detection Summary",
    ]
    for key, value in report_data['detection_summary'].items():
        lines.append(f"{key.replace('_', ' ').title()}: {value}")
    lines.extend([
        "",
        f"Field Status: {report_data['field_status']}",
        "",
        "Crop Health Analysis",
    ])
    for key, value in report_data['crop_health_analysis'].items():
        lines.append(f"{key.replace('_', ' ').title()}: {value}")
    lines.extend(["", "Weed Infestation Analysis"])
    for key, value in report_data['weed_infestation_analysis'].items():
        lines.append(f"{key.replace('_', ' ').title()}: {value}")
    lines.extend(["", "Recommendations"])
    for item in report_data['recommendations']:
        lines.append(f"- {item['title']}: {item['detail']}")
    lines.extend([
        "",
        "AI Insights",
        report_data['ai_insights']['explanation'],
        report_data['ai_insights']['accuracy'],
        report_data['ai_insights']['confidence_scoring'],
    ])
    return lines


def image_data_uri_to_temp_file(data_uri: str | None) -> str | None:
    if not data_uri or "," not in data_uri:
        return None
    try:
        header, encoded = data_uri.split(",", 1)
        suffix = ".png" if "png" in header.lower() else ".jpg"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(base64.b64decode(encoded))
        tmp.close()
        return tmp.name
    except Exception:
        return None


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.route("/")
def index():
    if DIST_DIR.exists():
        return send_from_directory(str(DIST_DIR), "index.html")
    return render_template("index.html")


@app.route("/api/predict", methods=["POST"])
@app.route("/predict", methods=["POST"])
def predict():
    """Accept an image, run YOLOv8, return annotated image + metrics."""
    ensure_history_loaded()

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use JPG / PNG / WEBP."}), 400

    confidence = float(request.form.get("confidence", 0.25)) if request.form.get("confidence") else 0.25
    imgsz = int(request.form.get("imgsz", 640)) if request.form.get("imgsz") else 640
    profile_id = normalize_profile_id(request.form.get("profile_id"))
    profile_name = request.form.get("profile_name") or DEFAULT_PROFILE_NAME

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
        "profile_id": profile_id,
        "profile_name": profile_name,
    }
    make_scan_entry_report(scan_entry)
    detection_history.insert(0, scan_entry)
    if len(detection_history) > HISTORY_LIMIT:
        detection_history.pop()
    save_history()
    sync_metrics_from_history()

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


def encode_sample_path(sample: str) -> str:
    return "/api/test-image/" + "/".join(quote(part, safe="") for part in sample.split("/"))


@app.route("/api/sample-images")
@app.route("/sample-images")
def sample_images():
    """Return curated sample images the user can try."""
    samples = [
        sample
        for sample in CURATED_SAMPLE_IMAGES
        if (BASE_DIR / sample).exists()
    ]

    if len(samples) < 25:
        for split in ("train", "valid", "test"):
            sample_dir = BASE_DIR / split / "images"
            if not sample_dir.exists():
                continue
            for f in sorted(sample_dir.iterdir()):
                sample = f"{split}/images/{f.name}"
                if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"} and sample not in samples:
                    samples.append(sample)
                if len(samples) >= 25:
                    break
            if len(samples) >= 25:
                break

    payload = [
        {
            'filename': sample,
            'label': Path(sample).name,
            'url': encode_sample_path(sample),
        }
        for sample in samples
    ]

    return jsonify(payload)


def resolve_sample_image(filename: str) -> tuple[Path, str] | None:
    """Resolve a curated sample path without allowing arbitrary file access."""
    clean_name = filename.strip().replace("\\", "/")
    parts = Path(clean_name).parts

    if len(parts) == 3 and parts[1] == "images" and parts[0] in {"train", "valid", "test"}:
        image_dir = BASE_DIR / parts[0] / "images"
        candidate = image_dir / parts[2]
        if candidate.exists() and candidate.is_file():
            return image_dir, parts[2]

    # Backward-compatible lookup for old basename-only sample entries.
    for split in ("test", "train", "valid"):
        image_dir = BASE_DIR / split / "images"
        candidate = image_dir / clean_name
        if candidate.exists() and candidate.is_file():
            return image_dir, clean_name

    return None


@app.route("/api/test-image/<path:filename>")
@app.route("/test-image/<path:filename>")
def serve_test_image(filename):
    """Serve a curated sample gallery image."""
    resolved = resolve_sample_image(filename)
    if resolved is None:
        return jsonify({"error": "Sample image not found"}), 404
    image_dir, image_name = resolved
    return send_from_directory(str(image_dir), image_name)


def should_return_json() -> bool:
    """Distinguish legacy API calls from browser refreshes on React routes."""
    if request.path.startswith("/api/"):
        return True
    accept = request.accept_mimetypes
    return accept.accept_json and not accept.accept_html


def serve_spa_index():
    if DIST_DIR.exists():
        return send_from_directory(str(DIST_DIR), "index.html")
    return render_template("index.html")


@app.route("/api/history")
def get_history():
    """Return detection history."""
    if not should_return_json():
        return serve_spa_index()
    profile_id = get_profile_id()
    entries = filter_history(profile_id)
    now = datetime.now()
    for entry in entries:
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
    return jsonify(entries[:50])


@app.route("/api/stats")
def get_stats():
    """Return cumulative dashboard stats."""
    return jsonify(compute_stats(get_profile_id()))


@app.route("/api/reset-metrics", methods=["POST"])
@app.route("/reset-metrics", methods=["POST"])
def reset_metrics():
    """Reset dashboard counters and saved scan history."""
    profile_id = get_profile_id()
    return jsonify({
        'status': 'reset',
        'stats': reset_scan_data(profile_id),
    })


@app.route("/api/analytics")
def get_analytics():
    """Return trend data for analytics."""
    entries = filter_history(get_profile_id())
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
        for entry in entries
    ]
    return jsonify({
        'timeline': timeline,
        'summary': compute_stats(get_profile_id()),
    })


@app.route("/api/report/<scan_id>")
def report(scan_id):
    """Return the detailed report for a specific scan."""
    ensure_history_loaded()
    entry = next((e for e in detection_history if e['id'] == scan_id), None)
    if not entry:
        return jsonify({'error': 'Scan not found'}), 404
    return jsonify(entry.get('report', build_report(entry)))


@app.route("/api/recommendations")
def get_recommendations():
    """Generate comprehensive farming recommendations based on scan history."""
    entries = filter_history(get_profile_id())
    if not entries:
        return jsonify({
            'recommendations': [],
            'stats': {'total_scans': 0, 'avg_weed_percentage': 0, 'risk_trend': 'unknown'}
        })

    # Analyze scan history for patterns
    recent_scans = entries[:10]  # Last 10 scans
    avg_weed_pct = sum(scan.get('weed_pct', 0) for scan in recent_scans) / len(recent_scans)

    # Calculate risk trend
    if len(recent_scans) >= 3:
        recent_avg = sum(scan.get('weed_pct', 0) for scan in recent_scans[:3]) / 3
        older_avg = sum(scan.get('weed_pct', 0) for scan in recent_scans[3:6]) / min(3, len(recent_scans[3:])) if len(recent_scans) > 3 else recent_avg
        risk_trend = 'increasing' if recent_avg > older_avg + 5 else 'decreasing' if recent_avg < older_avg - 5 else 'stable'
    else:
        risk_trend = 'unknown'

    recommendations = []

    # Generate recommendations based on analysis
    if avg_weed_pct > 40:
        recommendations.append({
            'id': 'emergency_weed_control',
            'title': '🚨 Emergency Weed Control Required',
            'description': 'Critical weed infestation detected across recent scans. Immediate professional intervention recommended.',
            'priority': 'critical',
            'category': 'immediate',
            'estimated_cost': 300,
            'timeline': 'Within 24 hours',
            'actions': ['Contact professional weed control service', 'Implement emergency herbicide application', 'Consider mechanical weed removal'],
            'risk_level': 'High',
            'potential_impact': 'Prevent total crop failure',
            'confidence': 95
        })

    if risk_trend == 'increasing':
        recommendations.append({
            'id': 'trend_monitoring',
            'title': '📈 Intensify Monitoring Schedule',
            'description': 'Weed pressure is increasing. Increase scanning frequency to prevent escalation.',
            'priority': 'high',
            'category': 'immediate',
            'estimated_cost': 0,
            'timeline': 'Immediate',
            'actions': ['Scan field every 2-3 days', 'Set up automated alerts', 'Document weed species and locations'],
            'risk_level': 'Medium',
            'potential_impact': 'Early intervention prevents major losses',
            'confidence': 85
        })

    # Standard recommendations based on weed levels
    if avg_weed_pct > 25:
        recommendations.append({
            'id': 'integrated_weed_management',
            'title': '🌱 Integrated Weed Management',
            'description': 'Implement comprehensive weed control combining multiple methods for sustainable results.',
            'priority': 'high',
            'category': 'immediate',
            'estimated_cost': 150,
            'timeline': 'Within 1 week',
            'actions': ['Apply selective herbicides', 'Manual weeding in critical areas', 'Improve crop spacing', 'Optimize irrigation timing'],
            'risk_level': 'Medium',
            'potential_impact': 'Reduce weed competition by 60-80%',
            'confidence': 90
        })

    # Preventive recommendations
    recommendations.append({
        'id': 'preventive_mulching',
        'title': '🛡️ Preventive Mulching Program',
        'description': 'Establish organic mulch barriers to prevent weed seed germination and emergence.',
        'priority': 'medium',
        'category': 'preventive',
        'estimated_cost': 200,
        'timeline': 'Next planting cycle',
        'actions': ['Apply 2-3 inch organic mulch layer', 'Use biodegradable mulch materials', 'Maintain mulch throughout season'],
        'risk_level': 'Low',
        'potential_impact': 'Prevent 70% of weed emergence',
        'confidence': 80
    })

    recommendations.append({
        'id': 'soil_health_management',
        'title': '🌿 Soil Health Optimization',
        'description': 'Improve soil fertility and structure to enhance crop competitiveness against weeds.',
        'priority': 'medium',
        'category': 'scheduled',
        'estimated_cost': 100,
        'timeline': 'Monthly',
        'actions': ['Test soil pH and nutrients', 'Apply organic amendments', 'Implement cover cropping', 'Practice crop rotation'],
        'risk_level': 'Low',
        'potential_impact': 'Strengthen crop resistance to weeds',
        'confidence': 75
    })

    # Technology recommendations
    recommendations.append({
        'id': 'precision_agriculture',
        'title': '🎯 Precision Agriculture Adoption',
        'description': 'Implement GPS-guided equipment and variable rate technology for targeted weed control.',
        'priority': 'low',
        'category': 'preventive',
        'estimated_cost': 500,
        'timeline': 'Next season',
        'actions': ['Invest in GPS-guided sprayer', 'Adopt variable rate application', 'Use drone surveillance', 'Implement auto-steer systems'],
        'risk_level': 'Low',
        'potential_impact': 'Reduce herbicide use by 30-50%',
        'confidence': 70
    })

    # Economic recommendations
    total_cost = sum(rec.get('estimated_cost', 0) for rec in recommendations)
    potential_savings = avg_weed_pct * 2.5  # Rough estimate: $2.5 per percentage point of weed control

    return jsonify({
        'recommendations': recommendations,
        'stats': {
            'total_scans': len(entries),
            'avg_weed_percentage': round(avg_weed_pct, 1),
            'risk_trend': risk_trend,
            'total_recommendations': len(recommendations),
            'estimated_cost': total_cost,
            'potential_savings': round(potential_savings, 0)
        },
        'analysis': {
            'weed_pressure_level': 'High' if avg_weed_pct > 40 else 'Medium' if avg_weed_pct > 20 else 'Low',
            'recommended_action_frequency': 'Daily' if avg_weed_pct > 40 else 'Weekly' if avg_weed_pct > 25 else 'Bi-weekly',
            'cost_benefit_ratio': round(potential_savings / max(total_cost, 1), 2)
        }
    })


@app.route("/api/crop-health")
def get_crop_health():
    """Comprehensive crop health analysis with trends and metrics."""
    entries = filter_history(get_profile_id())
    if not entries:
        return jsonify({
            'current_health': {},
            'trends': [],
            'health_metrics': {},
            'recommendations': [],
            'summary': {
                'total_scans': 0,
                'avg_crop_percentage': 0,
                'avg_weed_percentage': 0,
                'health_trend': 'stable'
            }
        })

    recent_scans = entries[:10]
    
    # Current health metrics
    latest = entries[0] if entries else {}
    crop_pct = latest.get('crop_pct', 0)
    weed_pct = latest.get('weed_pct', 0)
    confidence = latest.get('confidence', 0)
    confidence_ratio = confidence / 100 if confidence > 1 else confidence
    
    # Calculate crop vigor
    crop_vigor = max(0, min(100, int(crop_pct * 0.7 + confidence_ratio * 30)))
    
    # Yield loss prediction
    yield_loss = min(100, int(weed_pct * 1.5))
    
    # Water stress level
    water_stress = 'Low' if weed_pct < 20 else 'Moderate' if weed_pct < 50 else 'High'
    
    # Nutritional status
    nutrition_status = 'Excellent' if crop_pct > 80 else 'Good' if crop_pct > 60 else 'Fair' if crop_pct > 40 else 'Poor'
    
    # Disease risk
    disease_risk = 'Low' if (crop_pct > 70 and weed_pct < 20) else 'Moderate' if crop_pct > 50 else 'High'
    
    # Damage estimate
    estimated_damage = int((yield_loss / 10) * 500)
    
    # Calculate trends
    trends = []
    if len(recent_scans) >= 2:
        for i in range(len(recent_scans) - 1):
            current_confidence = recent_scans[i].get('confidence', 0)
            current_confidence_ratio = current_confidence / 100 if current_confidence > 1 else current_confidence
            next_confidence = recent_scans[i+1].get('confidence', 0)
            next_confidence_ratio = next_confidence / 100 if next_confidence > 1 else next_confidence
            current_vigor = max(0, min(100, int(recent_scans[i].get('crop_pct', 0) * 0.7 + current_confidence_ratio * 30)))
            next_vigor = max(0, min(100, int(recent_scans[i+1].get('crop_pct', 0) * 0.7 + next_confidence_ratio * 30)))
            
            trends.append({
                'scan_index': i,
                'vigor_score': current_vigor,
                'crop_pct': recent_scans[i].get('crop_pct', 0),
                'weed_pct': recent_scans[i].get('weed_pct', 0),
                'timestamp': recent_scans[i].get('timestamp', '')
            })
    
    # Health recommendations
    health_recommendations = []
    
    if crop_vigor < 40:
        health_recommendations.append({
            'type': 'critical',
            'title': 'Critical: Low Crop Vigor',
            'description': 'Crop vigor is critically low. Immediate intervention required.',
            'action': 'Apply emergency crop stimulant and reduce weed pressure'
        })
    elif crop_vigor < 60:
        health_recommendations.append({
            'type': 'warning',
            'title': 'Warning: Declining Crop Vigor',
            'description': 'Crop vigor is below optimal. Monitor closely.',
            'action': 'Apply foliar nutrition and intensify weed management'
        })
    
    if disease_risk == 'High':
        health_recommendations.append({
            'type': 'critical',
            'title': 'Disease Risk Alert',
            'description': 'High disease risk detected based on crop stress indicators.',
            'action': 'Apply fungicide preventively and improve air circulation'
        })
    
    if water_stress == 'High':
        health_recommendations.append({
            'type': 'warning',
            'title': 'Water Stress Detected',
            'description': 'High water stress indicated by weed pressure and crop condition.',
            'action': 'Increase irrigation frequency and add mulch'
        })
    
    if nutrition_status in ['Fair', 'Poor']:
        health_recommendations.append({
            'type': 'warning',
            'title': 'Nutritional Deficiency',
            'description': f'Crop nutritional status is {nutrition_status.lower()}.',
            'action': 'Apply balanced fertilizer and conduct soil test'
        })

    return jsonify({
        'current_health': {
            'crop_vigor_score': crop_vigor,
            'condition': 'Healthy' if weed_pct < 25 else 'Stable' if weed_pct < 40 else 'Stressed',
            'crop_percentage': crop_pct,
            'weed_percentage': weed_pct,
            'confidence_level': confidence_ratio,
            'timestamp': latest.get('timestamp', '')
        },
        'health_metrics': {
            'yield_loss_prediction': f"{yield_loss}%",
            'water_stress_level': water_stress,
            'nutritional_status': nutrition_status,
            'disease_risk': disease_risk,
            'estimated_damage_cost': f"${estimated_damage}",
            'days_until_critical': max(1, int(30 - (yield_loss / 3)))
        },
        'trends': trends[:5],  # Last 5 scans
        'recommendations': health_recommendations,
        'summary': {
            'total_scans': len(entries),
            'avg_crop_percentage': round(sum(s.get('crop_pct', 0) for s in recent_scans) / len(recent_scans), 1),
            'avg_weed_percentage': round(sum(s.get('weed_pct', 0) for s in recent_scans) / len(recent_scans), 1),
            'health_trend': 'improving' if len(trends) > 1 and trends[0]['vigor_score'] > trends[-1]['vigor_score'] else 'declining' if len(trends) > 1 else 'stable'
        }
    })


@app.route("/api/export-report/<scan_id>")
@app.route("/export-report/<scan_id>")
def export_report(scan_id):
    """Generate a PDF report for the selected scan."""
    ensure_history_loaded()
    entry = next((e for e in detection_history if e['id'] == scan_id), None)
    if not entry:
        return jsonify({'error': 'Scan not found'}), 404

    report_data = entry.get('report', build_report(entry))
    if FPDF is None:
        pdf_bytes = build_simple_pdf(
            'WeedICider AI Detection Report',
            report_lines(entry, report_data),
        )
        response = make_response(pdf_bytes)
        response.headers.set('Content-Type', 'application/pdf')
        response.headers.set('Content-Disposition', f"attachment; filename=weedicider-report-{entry['id']}.pdf")
        return response

    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=18)
    image_files: list[str] = []

    def add_page() -> None:
        pdf.add_page()
        pdf.set_draw_color(0, 0, 0)
        pdf.set_line_width(0.9)
        pdf.rect(10, 10, 190, 277)

    def ensure_space(height: float) -> None:
        if pdf.get_y() + height > 275:
            add_page()

    def section_title(title: str) -> None:
        ensure_space(13)
        pdf.ln(3)
        pdf.set_font('Helvetica', 'B', 13)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, sanitize_pdf_text(title.upper()), ln=True)
        pdf.set_draw_color(0, 0, 0)
        pdf.line(18, pdf.get_y(), 192, pdf.get_y())
        pdf.ln(3)

    def key_value(label: str, value) -> None:
        ensure_space(7)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(58, 6, sanitize_pdf_text(label), border=0)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(0, 6, sanitize_pdf_text(value))

    def paragraph(text: str) -> None:
        ensure_space(12)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(0, 5.8, sanitize_pdf_text(text))
        pdf.ln(1)

    add_page()
    pdf.set_xy(18, 20)
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, 'WeedICider AI Detection Report', ln=True)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 7, 'Smart Weed Detection System', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 6, sanitize_pdf_text(f"Scan ID: {entry['id']}"), ln=True)
    pdf.cell(0, 6, sanitize_pdf_text(f"Timestamp: {entry['timestamp']}"), ln=True)
    pdf.cell(0, 6, sanitize_pdf_text(f"Filename: {entry.get('filename', 'uploaded_image')}"), ln=True)

    original_image = image_data_uri_to_temp_file(entry.get('original_thumb'))
    result_image = image_data_uri_to_temp_file(entry.get('result_thumb'))
    image_files.extend([path for path in [original_image, result_image] if path])
    if original_image or result_image:
        section_title('Scan Images')
        start_y = pdf.get_y()
        if original_image:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(84, 6, 'Original Image', ln=0)
            pdf.image(original_image, x=18, y=start_y + 8, w=78, h=55)
        if result_image:
            pdf.set_xy(106, start_y)
            pdf.set_font('Helvetica', 'B', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(84, 6, 'Detection Output', ln=0)
            pdf.image(result_image, x=106, y=start_y + 8, w=78, h=55)
        pdf.set_y(start_y + 68)

    section_title('Detection Summary')
    for key, value in report_data['detection_summary'].items():
        key_value(key.replace('_', ' ').title(), value)
    key_value('Field Status', report_data['field_status'])

    section_title('Crop Health Analysis')
    for key, value in report_data['crop_health_analysis'].items():
        key_value(key.replace('_', ' ').title(), value)

    section_title('Weed Infestation Analysis')
    for key, value in report_data['weed_infestation_analysis'].items():
        key_value(key.replace('_', ' ').title(), value)

    section_title('Recommendations')
    for item in report_data['recommendations']:
        paragraph(f"{item['title']}: {item['detail']}")

    section_title('AI Insights')
    paragraph(report_data['ai_insights']['explanation'])
    paragraph(report_data['ai_insights']['accuracy'])
    paragraph(report_data['ai_insights']['confidence_scoring'])

    pdf_output = pdf.output(dest='S')
    if isinstance(pdf_output, str):
        pdf_bytes = pdf_output.encode('latin-1')
    else:
        pdf_bytes = bytes(pdf_output)

    for image_file in image_files:
        try:
            os.unlink(image_file)
        except OSError:
            pass

    response = make_response(pdf_bytes)
    response.headers.set('Content-Type', 'application/pdf')
    response.headers.set('Content-Disposition', f"attachment; filename=weedicider-report-{entry['id']}.pdf")
    return response


@app.route("/api/model-info")
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


@app.route("/api/backend-status")
@app.route("/backend-status")
def backend_status():
    """Return backend health and model status."""
    ensure_history_loaded()
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH),
        "loaded_classes": list(CLASS_NAMES.values()),
        "history_count": len(detection_history),
        "server_time": datetime.now().isoformat(),
    })


@app.route("/<path:path>")
def spa_fallback(path):
    """Serve built React assets and fall back to the SPA for direct page loads."""
    if path.startswith("api/"):
        return jsonify({"error": "API endpoint not found"}), 404

    if DIST_DIR.exists():
        candidate = DIST_DIR / path
        if candidate.exists() and candidate.is_file():
            return send_from_directory(str(DIST_DIR), path)
        return send_from_directory(str(DIST_DIR), "index.html")

    return render_template("index.html")


# ──────────────────────────────────────────────
if __name__ == "__main__":
    hydrate_history()
    port = int(os.environ.get("PORT", 5004))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
