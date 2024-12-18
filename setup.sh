#!/bin/bash

# Check for required environment variable
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "Error: HUGGINGFACE_TOKEN environment variable is not set"
    echo "Please run: export HUGGINGFACE_TOKEN=your_huggingface_token"
    exit 1
fi

echo "🚀 Starting setup process..."

echo "📦 Installing Node.js and npm..."
apt-get update
apt-get install -y nodejs npm

echo "📦 Installing Hugging Face CLI..."
pip install huggingface_hub

echo "🔑 Authenticating with Hugging Face..."
huggingface-cli login --token $HUGGINGFACE_TOKEN

echo "📁 Creating datasets directory..."
mkdir -p /workspace/datasets

echo "🔄 Cloning the Hugging Face repository..."
cd /workspace
git clone https://huggingface.co/spaces/fancyfeast/joy-caption-pre-alpha

echo "🐍 Setting up Python virtual environment..."
cd joy-caption-pre-alpha
python3 -m venv caption_venv
source caption_venv/bin/activate

echo "📦 Installing Python dependencies in venv..."
pip install torch==2.0.0
pip install huggingface_hub
pip install -v -r requirements.txt spaces protobuf

echo "🔑 Authenticating with Hugging Face in venv..."
huggingface-cli login --token $HUGGINGFACE_TOKEN

# Deactivate the venv
deactivate
cd ..

echo "📦 Installing Node.js dependencies..."
cd fluxcaption
npm ci
cd ..
git clone https://github.com/ostris/ai-toolkit.git
cd ai-toolkit
git submodule update --init --recursive
python -m venv venv
source venv/bin/activate
pip install torch
pip install -r requirements.txt
pip install --upgrade accelerate transformers diffusers huggingface_hub #Optional, run it if you run into issues

echo "✅ Setup complete!"