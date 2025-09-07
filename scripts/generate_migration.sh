#!/bin/bash

# Script to generate a new Alembic migration
# Usage: ./scripts/generate_migration.sh "description of changes"

set -e

# Check if description is provided
if [ -z "$1" ]; then
    echo "Usage: $0 \"migration description\""
    echo "Example: $0 \"add catalog item tags column\""
    exit 1
fi

DESCRIPTION="$1"

echo "🔍 Checking current database state..."

# Ensure PostgreSQL is running
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d db

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "📝 Generating migration: $DESCRIPTION"

# Generate the migration
poetry run alembic revision --autogenerate -m "$DESCRIPTION"

echo "✅ Migration generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review the generated migration file in alembic/versions/"
echo "2. Make any necessary manual adjustments"
echo "3. Apply the migration with: poetry run alembic upgrade head"
echo "4. Test the changes"
