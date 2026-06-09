FROM node:20

WORKDIR /code

# Set production environment
ENV NODE_ENV=production

# Copy the specific build version (passed as build arg)
ARG BUILD_VERSION
COPY build/${BUILD_VERSION}/ ./

# Install production dependencies using the package.json from the build
RUN npm install --production

# Create app.sh script (overwriting any existing one)
RUN echo '#!/bin/bash' > app.sh && \
    echo 'export VERSION=$(cat VERSION 2>/dev/null || echo "unknown")' >> app.sh && \
    echo 'node app.js' >> app.sh && \
    chmod +x app.sh

# Make health-check script executable if it exists (fixed typo)
RUN if [ -f build.health.sh ]; then chmod +x build.health.sh; fi

EXPOSE 5902

ENTRYPOINT ["./app.sh"]