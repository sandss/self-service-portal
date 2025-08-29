#!/bin/bash

# Jobs Dashboard - Quick Start Script
# This script builds and starts the entire full-stack application

echo "🚀 Starting Jobs Dashboard Full-Stack Application"
echo "================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"

# Build and start all services
echo "🔨 Building and starting services..."
echo "This may take a few minutes on first run..."

# Use docker compose if available, otherwise fall back to docker-compose
if docker compose version > /dev/null 2>&1; then
    docker compose up --build -d
else
    docker-compose up --build -d
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Application started successfully!"
    echo ""
    echo "📱 Access the application:"
    echo "   Frontend:  http://localhost:5173"
    echo "   API Docs:  http://localhost:8000/docs"
    echo "   API:       http://localhost:8000"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs:     docker compose logs -f"
    echo "   Stop:          docker compose down"
    echo "   Restart:       docker compose restart"
    echo ""
    echo "🧪 Test the API:"
    echo "   curl http://localhost:8000/health"
    echo "   curl -X POST http://localhost:8000/dev/seed"
    echo "   curl http://localhost:8000/jobs"
    echo ""
    echo "⏳ Services are starting... Give them ~30 seconds to fully initialize."
    echo "   Then open http://localhost:5173 and click 'Seed Demo Jobs' to see it in action!"
else
    echo "❌ Failed to start application. Check the logs:"
    echo "   docker compose logs"
fi
