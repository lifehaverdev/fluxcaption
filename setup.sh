#!/bin/bash

echo "🚀 Starting setup process..."

echo "📦 Updating system package lists..."
apt-get update

echo "📥 Installing system dependencies (nodejs, npm, git, python3-pip)..."
apt-get install -y nodejs npm git python3-pip

echo "📁 Creating workspace directory structure..."
mkdir -p /workspace/downloads
mkdir -p /workspace/training_data
mkdir -p /workspace/lora_output

echo "🔄 Cloning the Hugging Face repository..."
cd /workspace
git clone https://huggingface.co/spaces/fancyfeast/joy-caption-pre-alpha
cd joy-caption-pre-alpha

echo "🐍 Installing Python dependencies from requirements.txt..."
pip install -v -r requirements.txt

echo "📦 Installing Node.js dependencies..."
npm ci

echo "⚙️ Setting up environment file..."
if [ ! -f .env ]; then
    cp example.env .env
    echo "✨ Created .env file. Please edit it with your API tokens!"
fi

echo "✅ Setup complete! Please edit /workspace/joy-caption-pre-alpha/.env with your tokens"