#!/bin/bash

APP_PORT=5544  # From your values.yaml
MAX_ATTEMPTS=30
ATTEMPT=0

echo "Checking API health on port $APP_PORT..."

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Try a simple HTTP request (adjust endpoint as needed)
    if curl -f -s "http://localhost:$APP_PORT/api/health" > /dev/null || \
       curl -f -s "http://localhost:$APP_PORT/healthcheck" > /dev/null || \
       curl -f -s "http://localhost:$APP_PORT/" > /dev/null; then
        echo "SUCCESS: API is healthy!"
        exit 0
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS failed, retrying in 2 seconds..."
    sleep 2
done

echo "ERROR: API failed health check after $MAX_ATTEMPTS attempts"
exit 1