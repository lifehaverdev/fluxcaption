#!/bin/bash

# Check for required environment variable
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    echo "Please run: export GITHUB_TOKEN=your_github_token"
    exit 1
fi

# Install system dependencies
apt-get update
apt-get install -y nodejs npm git python3-pip

# Create workspace structure
mkdir -p /workspace/downloads
mkdir -p /workspace/training_data
mkdir -p /workspace/lora_output

# Clone the Hugging Face repository
cd /workspace
git clone https://huggingface.co/spaces/fancyfeast/joy-caption-pre-alpha
cd joy-caption-pre-alpha

# Install Python dependencies (assuming there's a requirements.txt)
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# Install Node dependencies from package-lock.json
npm ci

# Copy example.env to .env if it doesn't exist
if [ ! -f .env ]; then
    cp example.env .env
    echo "Created .env file. Please edit it with your API tokens!"
fi

echo "Setup complete! Please edit /workspace/joy-caption-pre-alpha/.env with your tokens"