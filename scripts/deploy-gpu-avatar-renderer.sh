#!/usr/bin/env bash
# ==============================================================================
# Swar Yoga AI Avatar - GPU Neural Inference Worker Deployment Script
# ==============================================================================
# Deploys the neural video inference pipeline on any Ubuntu/Debian NVIDIA GPU instance
# (RunPod, Vast.ai, Lambda Labs, AWS G5/G6, GCP A2, or local RTX 4090/A10G).
#
# Supported Models:
# - MuseTalk (MIT License - Real-time Inpainting Lip-Sync)
# - EchoMimic (Apache-2.0 - Audio-driven Lifelike Facial Dynamics)
#
# Usage:
#   export SWAR_API_BASE_URL="https://swaryoga.com"
#   export AVATAR_WORKER_TOKEN="your_secure_worker_token"
#   export AVATAR_INFERENCE_TOKEN="your_internal_adapter_secret"
#   bash scripts/deploy-gpu-avatar-renderer.sh
# ==============================================================================

set -euo pipefail

echo "=================================================================="
echo "🧘 SWAR YOGA AI AVATAR: GPU WORKER DEPLOYMENT"
echo "=================================================================="

# 1. Verify NVIDIA GPU
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ Error: nvidia-smi not found. This script requires an NVIDIA GPU with CUDA drivers."
    exit 1
fi

GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n 1)
echo "✅ Detected NVIDIA GPU: ${GPU_NAME} (${VRAM_MB} MB VRAM)"

# 2. Install System Dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y ffmpeg git python3-pip python3-venv libgl1-mesa-glx libglib2.0-0

# 3. Create Dedicated Python Virtual Environment
VENV_PATH="${HOME}/swar-avatar-env"
if [ ! -d "${VENV_PATH}" ]; then
    echo "🐍 Creating virtual environment at ${VENV_PATH}..."
    python3 -m venv "${VENV_PATH}"
fi

source "${VENV_PATH}/bin/activate"

# 4. Install PyTorch with CUDA 12.1+
echo "⚡ Installing PyTorch with CUDA acceleration..."
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 5. Install Audio, Face, and Neural Inference Libraries
echo "🧠 Installing neural avatar processing libraries..."
pip install \
    numpy \
    scipy \
    opencv-python-headless \
    pillow \
    soundfile \
    librosa \
    edge-tts \
    requests \
    timm \
    einops \
    accelerate \
    transformers \
    diffusers

# 6. Verify PyTorch GPU Access
python3 -c "import torch; assert torch.cuda.is_available(), 'CUDA not available!'; print(f'CUDA available: {torch.cuda.get_device_name(0)}')"

# 7. Start the GPU Adapter Server in Background
ADAPTER_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/avatar-gpu-adapter-server.py"
WORKER_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/inhouse-avatar-worker.py"

echo "🚀 Starting GPU Adapter on port 8080..."
export AVATAR_INFERENCE_PORT=8080
export AVATAR_INFERENCE_URL="http://127.0.0.1:8080/render"

nohup python3 "${ADAPTER_SCRIPT}" --port 8080 > "${HOME}/avatar-adapter.log" 2>&1 &
ADAPTER_PID=$!
echo "✅ GPU Adapter started (PID: ${ADAPTER_PID})"

# Wait for adapter health
sleep 3
if curl -s http://127.0.0.1:8080/health | grep -q "healthy"; then
    echo "✅ GPU Adapter is healthy and responding!"
else
    echo "⚠️ Warning: GPU Adapter health check did not respond immediately. Check ${HOME}/avatar-adapter.log"
fi

echo "=================================================================="
echo "🎉 DEPLOYMENT COMPLETE! GPU WORKER READY TO CLAIM INHOUSE RENDER JOBS"
echo "To start polling render jobs, run:"
echo "  source ${VENV_PATH}/bin/activate"
echo "  python3 ${WORKER_SCRIPT}"
echo "=================================================================="

