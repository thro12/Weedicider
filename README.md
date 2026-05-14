# WeedICider - AI-Powered Weed Detection System

![WeedICider Logo](https://img.shields.io/badge/WeedICider-AI%20Farming-blue?style=for-the-badge&logo=robot)
![Python](https://img.shields.io/badge/Python-3.11.9-blue?style=flat&logo=python)
![React](https://img.shields.io/badge/React-18.2.0-blue?style=flat&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0+-blue?style=flat&logo=flask)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Object%20Detection-green?style=flat&logo=tensorflow)

An intelligent agricultural solution that uses computer vision and AI to detect weeds in crop fields, helping farmers optimize their weed management practices and improve crop yields.

## 🌾 Features

- **AI-Powered Detection**: Advanced YOLOv8 model trained on agricultural datasets
- **Real-time Analysis**: Instant weed detection with confidence scores
- **Interactive Dashboard**: Modern React-based UI with analytics and insights
- **Crop Health Monitoring**: Comprehensive analysis of crop conditions
- **Smart Recommendations**: AI-generated suggestions for weed management
- **Historical Tracking**: Scan history and performance analytics
- **PDF Reports**: Generate detailed reports for documentation
- **Multi-format Support**: Upload images in PNG, JPG, JPEG, WebP, BMP formats

## 🚀 Live Demo

🌐 **[View Live Application](https://weedicider.onrender.com)**

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Model Information](#-model-information)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠 Technology Stack

### Backend
- **Python 3.11.9**
- **Flask** - Web framework
- **YOLOv8 (Ultralytics)** - Object detection model
- **OpenCV** - Image processing
- **Pillow** - Image manipulation
- **FPDF** - PDF generation

### Frontend
- **React 18.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Infrastructure
- **Render** - Cloud deployment platform
- **Gunicorn** - WSGI server
- **Git** - Version control

## 📦 Installation

### Prerequisites
- Python 3.11.9
- Node.js 18+
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/thro12/Weedicider.git
   cd Weedicider
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate

   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to frontend directory
   cd dashboard-ui

   # Install Node.js dependencies
   npm install

   # Build the frontend (for production)
   npm run build

   # Return to root directory
   cd ..
   ```

4. **Run the Application**
   ```bash
   # Start the Flask backend
   python app.py

   # In another terminal, start the frontend dev server
   cd dashboard-ui && npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:5004

## 🎯 Usage

### Web Interface
1. **Upload Images**: Click "Upload Image" or drag and drop images
2. **Live Detection**: Use your camera for real-time weed detection
3. **View Results**: See detected weeds highlighted with bounding boxes
4. **Generate Reports**: Download PDF reports with detailed analysis
5. **Track History**: Monitor your scanning history and analytics

### API Usage
The backend provides RESTful APIs for integration:

```bash
# Get system stats
curl http://localhost:5004/api/stats

# Upload image for detection
curl -X POST -F "image=@crop_image.jpg" http://localhost:5004/api/predict

# Get model information
curl http://localhost:5004/api/model-info
```

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get system statistics |
| POST | `/api/predict` | Upload image for weed detection |
| GET | `/api/history` | Get scan history |
| GET | `/api/model-info` | Get model information |
| GET | `/api/sample-images` | Get sample images for testing |
| GET | `/api/analytics` | Get analytics data |
| GET | `/api/recommendations` | Get AI recommendations |

### Request/Response Examples

#### Image Prediction
```json
POST /api/predict
Content-Type: multipart/form-data

{
  "image": "file.jpg",
  "confidence": 0.25,
  "imgsz": 640
}
```

Response:
```json
{
  "image": "base64_encoded_image",
  "detections": [
    {
      "class": "weed",
      "confidence": 0.87,
      "bbox": [100, 150, 200, 250]
    }
  ],
  "metrics": {
    "total": 15,
    "crops": 12,
    "weeds": 3,
    "crop_pct": 80.0,
    "weed_pct": 20.0
  }
}
```

## 🧠 Model Information

- **Model**: YOLOv8 Small (YOLOv8s)
- **Architecture**: CSPDarknet53 backbone with PANet neck
- **Classes**: 2 (crop, weed)
- **Input Size**: 640x640 pixels
- **Training Dataset**: SMART_WEED_DETECTION_SYSTEM v6
- **Images Trained**: 1,056
- **Performance**: mAP50: 42.1%, mAP50-95: 23.6%

### Model Capabilities
- **Precision**: High accuracy weed detection
- **Speed**: Real-time inference (< 100ms per image)
- **Robustness**: Works in various lighting and field conditions
- **Scalability**: Optimized for edge deployment

## 🚀 Deployment

### Render Deployment (Recommended)

1. **Connect Repository**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Select the `main` branch

2. **Configure Service**
   - Service Type: Web Service
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt && cd dashboard-ui && npm ci && npm run build`
   - Start Command: `gunicorn app:app`

3. **Environment Variables**
   ```
   PYTHON_VERSION=3.11.9
   PORT=10000  # Render assigns automatically
   ```

4. **Deploy**
   - Render will automatically build and deploy your application
   - Access your live application at the provided URL

### Manual Deployment

For other platforms, ensure:
- Python 3.11.9 environment
- All dependencies installed
- Frontend built (`npm run build`)
- Proper environment variables set

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for React components
- Write clear commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ultralytics** for the YOLOv8 framework
- **OpenCV** community for computer vision tools
- **React** team for the amazing frontend framework
- **Render** for reliable cloud hosting

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Email: [your-email@example.com]
- Documentation: [Link to docs if available]

---

**Built with ❤️ for smarter farming and sustainable agriculture**

⭐ Star this repository if you find it helpful!