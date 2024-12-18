#!/bin/bash

# Install dependencies
apt-get update
apt-get install -y nodejs npm git python3-pip

# Create workspace structure
mkdir -p /workspace/downloads
mkdir -p /workspace/training_data
mkdir -p /workspace/lora_output

# Clone our repository
cd /workspace
git clone https://github.com/yourusername/lora-training-tools.git
cd lora-training-tools

# Install Node dependencies
npm install @gradio/client openai dotenv

# Copy example.env to .env if it doesn't exist
if [ ! -f .env ]; then
    cp example.env .env
    echo "Created .env file. Please edit it with your tokens!"
fi

echo "Setup complete! Please edit /workspace/lora-training-tools/.env with your tokens" 