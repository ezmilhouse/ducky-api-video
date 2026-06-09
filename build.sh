#!/bin/bash
set -e

CREATE_RELEASE=false
INSTALL_DEPS=false
PROJECT_TYPE=""
SAVE_LOCAL=false 
VERSION=""

# Auto-detect project type based on files present
detect_project_type() {
    # Check for frontend-specific files (definitive app indicators)
    if [ -f "vite.config.js" ] || [ -f "public/css/app.scss" ] || [ -d "public/css" ]; then
        echo "app"
    # If no frontend build files found, assume API
    else
        echo "api"
    fi
}

# Read build configuration and apply production host replacements
read_build_config() {
    local build_json_file="build.json"
    
    if [[ ! -f "$build_json_file" ]]; then
        echo "WARNING: build.json not found. Skipping host replacement."
        return 1
    fi
    
    # Read local and production host values from build.json
    if command -v python3 >/dev/null 2>&1; then
        BUILD_LOCAL_HOST=$(python3 -c "
import json, sys
try:
    with open('$build_json_file', 'r') as f:
        data = json.load(f)
    print(data.get('host', ''))
except:
    print('')
")
        BUILD_PRODUCTION_HOST=$(python3 -c "
import json, sys
try:
    with open('$build_json_file', 'r') as f:
        data = json.load(f)
    print(data.get('host_production', ''))
except:
    print('')
")
    elif command -v node >/dev/null 2>&1; then
        BUILD_LOCAL_HOST=$(node -e "
try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$build_json_file', 'utf8'));
    console.log(data.host || '');
} catch {
    console.log('');
}
")
        BUILD_PRODUCTION_HOST=$(node -e "
try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$build_json_file', 'utf8'));
    console.log(data.host_production || '');
} catch {
    console.log('');
}
")
    else
        echo "ERROR: No JSON parser available (python3 or node required)"
        return 1
    fi
    
    # Validate that we got valid host values
    if [[ -z "$BUILD_LOCAL_HOST" || -z "$BUILD_PRODUCTION_HOST" ]]; then
        echo "ERROR: Could not read host values from build.json"
        echo "Local host: '$BUILD_LOCAL_HOST'"
        echo "Production host: '$BUILD_PRODUCTION_HOST'"
        return 1
    fi
    
    echo "> Read build configuration:"
    echo "  Local host: $BUILD_LOCAL_HOST"
    echo "  Production host: $BUILD_PRODUCTION_HOST"
    
    return 0
}

# Generate host derivatives for build process
generate_build_host_derivatives() {
    # Generate derivatives for local host (what to replace)
    BUILD_LOCAL_HOST_NO_DOTS="${BUILD_LOCAL_HOST//./}"
    BUILD_LOCAL_HOST_TLD=$(extract_tld_build "$BUILD_LOCAL_HOST")
    BUILD_LOCAL_HOST_TLD_NO_DOTS="${BUILD_LOCAL_HOST_TLD//./}"
    
    # Generate derivatives for production host (what to replace with)
    BUILD_PRODUCTION_HOST_NO_DOTS="${BUILD_PRODUCTION_HOST//./}"
    BUILD_PRODUCTION_HOST_TLD=$(extract_tld_build "$BUILD_PRODUCTION_HOST")
    BUILD_PRODUCTION_HOST_TLD_NO_DOTS="${BUILD_PRODUCTION_HOST_TLD//./}"
    
    echo "> Generated host derivatives:"
    echo "  Local TLD: $BUILD_LOCAL_HOST_TLD"
    echo "  Local no dots: $BUILD_LOCAL_HOST_NO_DOTS"
    echo "  Local TLD no dots: $BUILD_LOCAL_HOST_TLD_NO_DOTS"
    echo "  Production TLD: $BUILD_PRODUCTION_HOST_TLD"
    echo "  Production no dots: $BUILD_PRODUCTION_HOST_NO_DOTS"
    echo "  Production TLD no dots: $BUILD_PRODUCTION_HOST_TLD_NO_DOTS"
}

# Extract TLD for build process (copy of extract_tld function)
extract_tld_build() {
    local host="$1"
    # Split by dots and take last two parts for TLD
    local parts=(${host//./ })
    local num_parts=${#parts[@]}
    
    if [[ $num_parts -ge 2 ]]; then
        echo "${parts[$((num_parts-2))]}.${parts[$((num_parts-1))]}"
    else
        # If only one part, return the whole thing
        echo "$host"
    fi
}

# Apply production host replacements using build.replacements.sh
apply_production_host_replacements() {
    local version="$1"
    local build_dir="build/${version}"
    
    echo "Applying production host replacements..."
    
    # Check if build.replacements.sh exists
    if [[ ! -f "build.replacements.sh" ]]; then
        echo "WARNING: build.replacements.sh not found. Skipping host replacement."
        return 0
    fi
    
    # Read build configuration
    if ! read_build_config; then
        echo "WARNING: Could not read build configuration. Skipping host replacement."
        return 0
    fi
    
    # Generate host derivatives
    generate_build_host_derivatives
    
    # Check if hosts are different (no point replacing if they're the same)
    if [[ "$BUILD_LOCAL_HOST" == "$BUILD_PRODUCTION_HOST" ]]; then
        echo "> Local and production hosts are the same ($BUILD_LOCAL_HOST). Skipping replacement."
        return 0
    fi
    
    # Apply direct host replacements to env.json in build directory
    echo "> Applying direct host replacements to build artifacts in $build_dir..."
    
    # Change to build directory for replacements
    if cd "$build_dir"; then
        # Apply environment file replacements first
        if [[ -f "env.json" ]]; then
            echo "> Replacing hosts in env.json..."
            
            # Direct host replacements (local -> production)
            # Escape dots for sed regex
            local escaped_local_host="${BUILD_LOCAL_HOST//./\\.}"
            local escaped_local_tld="${BUILD_LOCAL_HOST_TLD//./\\.}"
            
            sed -i '' "s/${escaped_local_host}/${BUILD_PRODUCTION_HOST}/g" "env.json"
            sed -i '' "s/${escaped_local_tld}/${BUILD_PRODUCTION_HOST_TLD}/g" "env.json"
            sed -i '' "s/${BUILD_LOCAL_HOST_NO_DOTS}/${BUILD_PRODUCTION_HOST_NO_DOTS}/g" "env.json"
            sed -i '' "s/${BUILD_LOCAL_HOST_TLD_NO_DOTS}/${BUILD_PRODUCTION_HOST_TLD_NO_DOTS}/g" "env.json"
            
            echo "SUCCESS: Updated env.json with production hosts"
        fi
        
        # Files to exclude from host replacement (already configured for both environments)
        local excluded_files=(
            "app/db/clients.js"
        )
        
        # Apply host replacements to other configuration files that might have hosts
        for config_file in *.js *.json app.sh; do
            if [[ -f "$config_file" && "$config_file" != "env.json" ]]; then
                # Check if this file should be excluded
                local skip_file=false
                for excluded in "${excluded_files[@]}"; do
                    if [[ "$config_file" == "$excluded" ]] || [[ "$config_file" == *"$(basename "$excluded")" ]]; then
                        skip_file=true
                        break
                    fi
                done
                
                if [[ "$skip_file" == true ]]; then
                    echo "> Skipping $config_file (already configured for both environments)"
                    continue
                fi
                
                echo "> Checking $config_file for host references..."
                
                # Only replace if file actually contains the local host
                if grep -q "$BUILD_LOCAL_HOST" "$config_file" 2>/dev/null; then
                    local escaped_local_host="${BUILD_LOCAL_HOST//./\\.}"
                    local escaped_local_tld="${BUILD_LOCAL_HOST_TLD//./\\.}"
                    
                    sed -i '' "s/${escaped_local_host}/${BUILD_PRODUCTION_HOST}/g" "$config_file"
                    sed -i '' "s/${escaped_local_tld}/${BUILD_PRODUCTION_HOST_TLD}/g" "$config_file"
                    sed -i '' "s/${BUILD_LOCAL_HOST_NO_DOTS}/${BUILD_PRODUCTION_HOST_NO_DOTS}/g" "$config_file"
                    sed -i '' "s/${BUILD_LOCAL_HOST_TLD_NO_DOTS}/${BUILD_PRODUCTION_HOST_TLD_NO_DOTS}/g" "$config_file"
                    
                    echo "SUCCESS: Updated $config_file with production hosts"
                fi
            fi
        done
        
        # Also check for nested app/db/clients.js specifically
        if [[ -f "app/db/clients.js" ]]; then
            echo "> Skipping app/db/clients.js (already configured for both environments)"
        fi
        
        # Return to original directory
        cd - > /dev/null
    else
        echo "ERROR: Could not change to build directory: $build_dir"
        return 1
    fi
    
    echo "> Production host replacement completed successfully!"
    echo "  Transformed: $BUILD_LOCAL_HOST -> $BUILD_PRODUCTION_HOST"
    echo "  Excluded files: ${excluded_files[*]}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --npm-install)
            INSTALL_DEPS=true
            shift
            ;;
        --release)
            CREATE_RELEASE=true
            shift
            ;;
        --save-local)
            SAVE_LOCAL=true
            shift
            ;;
        --type)
            PROJECT_TYPE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 <version> [--npm-install] [--release] [--type app|api]"
            echo ""
            echo "Arguments:"
            echo "  version        Version string (e.g., 0.0.1-myapp-rc14)"
            echo "  --npm-install  Install npm dependencies for frontend building"
            echo "  --release      Commit build and create GitHub release"
            echo "  --save-local   Copy built assets to local public/ for testing"  # Add this
            echo "  --type         Force project type (app|api) - auto-detected if not specified"
            echo ""
            echo "Examples:"
            echo "  $0 0.0.1-myapp-rc14                       # Build only (auto-detect type)"
            echo "  $0 0.0.1-myapp-rc14 --npm-install         # Build and install deps"
            echo "  $0 0.0.1-myapp-rc14 --release             # Build and create release"
            echo "  $0 0.0.1-myapp-rc14 --type api --release  # Force API type and release"
            exit 0
            ;;
        *)
            if [[ -z "$VERSION" ]]; then
                VERSION="$1"
            else
                echo "ERROR: Unknown argument: $1"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# Set default version if not provided
if [[ -z "$VERSION" ]]; then
    VERSION="0.0.0-local"
fi

# Auto-detect project type if not specified
if [[ -z "$PROJECT_TYPE" ]]; then
    PROJECT_TYPE=$(detect_project_type)
fi

echo "Building ${PROJECT_TYPE} version: ${VERSION}..."

# Validate version format (allow dev version for testing)
if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+-[A-Za-z0-9]+-rc[0-9]+$ ]] && [[ "${VERSION}" != "0.0.0-local" ]]; then
    echo "ERROR: Invalid version format: ${VERSION}"
    echo "Expected format: x.x.x-projectname-rcX (e.g., 0.0.1-holodeck-rc1)"
    exit 1
fi

# Validate project type
if [[ "$PROJECT_TYPE" != "app" ]] && [[ "$PROJECT_TYPE" != "api" ]]; then
    echo "ERROR: Could not determine project type. Please specify --type app or --type api"
    echo "Current directory contents:"
    ls -la
    exit 1
fi

echo "Detected project type: ${PROJECT_TYPE}"

# Clean only the current version and create versioned directory
rm -rf build/${VERSION}
mkdir -p build/${VERSION}

# Copy runtime files to build directory (resolving symlinks)
echo "Preparing ${PROJECT_TYPE} deployment package..."

# Copy app directory (resolve symlinks, fast)
if [ -d "app" ]; then
    echo "> Copying application code (resolving symlinks)..."
    tar -chf - app | tar -xf - -C build/${VERSION}/
else
    echo "> Skipping app directory (not found)"
fi

# Copy public directory based on project type
if [[ "$PROJECT_TYPE" == "app" ]] && [ -d "public" ]; then
    echo "> Copying public assets for app..."
    # Use rsync to copy and resolve symlinks, ignoring broken ones
    if command -v rsync >/dev/null 2>&1; then
        rsync -avL --copy-unsafe-links public/ build/${VERSION}/public/ 2>/dev/null || {
            echo "> Some symlinks may be broken, using tar method..."
            tar -chf - public 2>/dev/null | tar -xf - -C build/${VERSION}/ || {
                echo "> Tar failed too, using basic copy..."
                cp -r public build/${VERSION}/ 2>/dev/null || echo "> Some files couldn't be copied"
            }
        }
    else
        # Fallback: use tar to resolve symlinks
        tar -chf - public 2>/dev/null | tar -xf - -C build/${VERSION}/ || {
            echo "> Tar failed, using basic copy..."
            cp -r public build/${VERSION}/ 2>/dev/null || echo "> Some files couldn't be copied"
        }
    fi
elif [[ "$PROJECT_TYPE" == "api" ]] && [ -d "public" ]; then
    echo "> Creating public for API..."
    mkdir -p build/${VERSION}/public
    echo "> Copying public/js for API..."
    cp -r public/js build/${VERSION}/public/
     echo "> Copying public/html for API..."
    cp -r public/html build/${VERSION}/public/
else
    echo "> Skipping public directory (not found or not needed for ${PROJECT_TYPE})"
fi

# Copy individual files (resolving symlinks where needed)
echo "> Copying individual files..."
[ -f "package.json" ] && cp -L package.json build/${VERSION}/
[ -f "package-lock.json" ] && cp -L package-lock.json build/${VERSION}/

# Copy main application files
[ -f "app.js" ] && cp -L app.js build/${VERSION}/
[ -f "server.js" ] && cp -L server.js build/${VERSION}/
[ -f "index.js" ] && cp -L index.js build/${VERSION}/

# Copy runtime scripts
[ -f "app.sh" ] && cp -L app.sh build/${VERSION}/
[ -f "build.health.sh" ] && cp -L build.health.sh build/${VERSION}/build.health.sh

# Copy any additional runtime files
[ -f "*.config.js" ] && cp -L *.config.js build/${VERSION}/ 2>/dev/null || true
[ -f "*.config.json" ] && cp -L *.config.json build/${VERSION}/ 2>/dev/null || true

# Use production environment config as the main env.json
echo "> Setting up production environment..."
if [ -f "env.production.json" ]; then
    echo "> Using env.production.json as env.json for deployment"
    cp -L env.production.json build/${VERSION}/env.json
elif [ -f "env.json.example" ]; then
    echo "> No env.production.json found, using env.json.example as fallback"
    cp -L env.json.example build/${VERSION}/env.json
elif [ -f "env.json" ]; then
    echo "> Using existing env.json for deployment"
    cp -L env.json build/${VERSION}/env.json
else
    echo "WARNING: No production environment config found! Creating minimal env.json"
    echo '{"NODE_ENV": "production"}' > build/${VERSION}/env.json
fi

# Create version info file
echo "> Creating version info..."
echo "${VERSION}" > build/${VERSION}/VERSION
echo "{\"version\": \"${VERSION}\", \"built\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"type\": \"${PROJECT_TYPE}\"}" > build/${VERSION}/version.json

# Frontend asset building (only for app projects)
if [[ "$PROJECT_TYPE" == "app" ]]; then
    echo "Building and minifying frontend assets..."

    cd build/${VERSION}

    # Ensure frontend directories exist
    mkdir -p public/js public/css dist/assets

    # Install dependencies only if explicitly requested
    if [[ "$INSTALL_DEPS" == "true" ]]; then
        echo "> Installing dependencies (--npm-install flag)..."
        npm ci --silent
        DEPS_INSTALLED=true
    else
        echo "> Skipping dependency installation (use --npm-install to install)"
        DEPS_INSTALLED=false
    fi

    # Build JavaScript with Vite (if vite.config.js exists)
    if [ -f "../../vite.config.js" ]; then
        echo "> Building JavaScript with Vite..."
        
        # Copy vite config to build directory temporarily
        cp ../../vite.config.js .
        
        # Build with Vite
        npx vite build
        
        # Find the built JS file and copy it to versioned name
        MAIN_JS_FILE=$(find dist/assets -name "app-*.js" | head -n 1)
        
        if [ -n "$MAIN_JS_FILE" ] && [ -f "$MAIN_JS_FILE" ]; then
            cp "$MAIN_JS_FILE" "public/js/app.min.${VERSION}.js"
            echo "SUCCESS: JavaScript built: public/js/app.min.${VERSION}.js"
            
            # Remove original unversioned file if it exists
            rm -f public/js/app.js
        else
            echo "> No Vite output found, checking for existing JS..."
            if [ -f "public/js/app.js" ]; then
                cp "public/js/app.js" "public/js/app.min.${VERSION}.js"
                rm -f public/js/app.js
                echo "SUCCESS: JavaScript versioned: public/js/app.min.${VERSION}.js"
            fi
        fi
        
        # Clean up build artifacts
        rm -rf dist vite.config.js
    else
        echo "> No vite.config.js found, skipping Vite build"
        if [ -f "public/js/app.js" ]; then
            cp "public/js/app.js" "public/js/app.min.${VERSION}.js"
            rm -f public/js/app.js
            echo "SUCCESS: JavaScript versioned: public/js/app.min.${VERSION}.js"
        fi
    fi

    # Build CSS with Sass
    if [ -f "public/css/app.scss" ]; then
        echo "> Building CSS with Sass..."
        
        # Build SCSS to compressed CSS with version
        npx sass ./public/css/app.scss:./public/css/app.min.${VERSION}.css --style=compressed --no-source-map --quiet
        
        echo "SUCCESS: CSS built: public/css/app.min.${VERSION}.css"
        
        # Remove original unversioned files
        rm -f public/css/app.css
    else
        echo "> No app.scss found, checking for existing CSS..."
        if [ -f "public/css/app.css" ]; then
            cp "public/css/app.css" "public/css/app.min.${VERSION}.css"
            rm -f public/css/app.css
            echo "SUCCESS: CSS versioned: public/css/app.min.${VERSION}.css"
        fi
    fi

    # Clean up node_modules if we installed them temporarily
    if [[ "$DEPS_INSTALLED" == "true" ]]; then
        echo "> Cleaning up build dependencies..."
        rm -rf node_modules
    fi

    # Back to root directory
    cd ../..

    # Get file sizes for final report
    JS_SIZE="0B"
    CSS_SIZE="0B"

    if [ -f "build/${VERSION}/public/js/app.min.${VERSION}.js" ]; then
        JS_SIZE=$(ls -lh "build/${VERSION}/public/js/app.min.${VERSION}.js" | awk '{print $5}')
    fi

    if [ -f "build/${VERSION}/public/css/app.min.${VERSION}.css" ]; then
        CSS_SIZE=$(ls -lh "build/${VERSION}/public/css/app.min.${VERSION}.css" | awk '{print $5}')
    fi

    echo "> Frontend asset building complete"
    echo ""
    echo "Build completed successfully!"
    echo "Project Type: ${PROJECT_TYPE}"
    echo "Version: ${VERSION}"
    echo "Build location: build/${VERSION}/"
    echo ""
    echo "Files built:"
    echo "   JavaScript: public/js/app.min.${VERSION}.js (${JS_SIZE})"
    echo "   CSS:        public/css/app.min.${VERSION}.css (${CSS_SIZE})"
    echo ""

elif [[ "$PROJECT_TYPE" == "api" ]]; then
    echo "> API project - no frontend assets to build"
    echo ""
    echo "Build completed successfully!"
    echo "Project Type: ${PROJECT_TYPE}"
    echo "Version: ${VERSION}"
    echo "Build location: build/${VERSION}/"
    echo ""
    echo "API files packaged:"
    echo "   Main application: $(ls build/${VERSION}/*.js 2>/dev/null | head -1 | xargs basename || echo 'N/A')"
    echo "   Health check: build.health.sh"
    echo "   Environment: env.json"
    echo "   Version info: VERSION, version.json"
    echo ""
fi

if [[ "$SAVE_LOCAL" == "true" ]]; then

    echo ""
    echo "Copying built assets to local public directory for testing..."
    
    if [[ "$PROJECT_TYPE" == "app" ]]; then

        # Copy built JS with tmp_ prefix
        if [ -f "build/${VERSION}/public/js/app.min.${VERSION}.js" ]; then
            cp "build/${VERSION}/public/js/app.min.${VERSION}.js" "public/js/tmp.app.min.${VERSION}.js"
            echo "> Copied: public/js/tmp.app.min.${VERSION}.js"
        fi
        
        # Copy built CSS with tmp_ prefix
        if [ -f "build/${VERSION}/public/css/app.min.${VERSION}.css" ]; then
            cp "build/${VERSION}/public/css/app.min.${VERSION}.css" "public/css/tmp.app.min.${VERSION}.css"
            echo "> Copied: public/css/tmp.app.min.${VERSION}.css"
        fi
        echo ""
        echo "Built assets copied to public/ directory"
    else
        echo "> --save-local only applies to app projects"
    fi
fi

echo "> Symlink resolution complete"

# Apply production host replacements to build artifacts
apply_production_host_replacements "$VERSION"

echo ""
echo "${PROJECT_TYPE} build complete for version: ${VERSION}!"

# Update Argo CD manifests
update_argo_manifests() {
    local version="$1"
    local project_type="$2"
    
    echo "> Updating Argo CD manifests..."
    
    # Detect project key from version (extract between first - and second -)
    # e.g., 0.0.1-holodeck-rc62 -> holodeck
    local project_key=""
    if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-([^-]+)-rc[0-9]+$ ]]; then
        project_key="${BASH_REMATCH[1]}"
        echo "✓ Extracted project key: $project_key"
    else
        echo "ERROR: Cannot extract project key from version: $version"
        return 1
    fi
    
    # Path to manifest directory
    local manifest_base="/Users/mfu/Workspace/superhot/manifest"
    local values_file="$manifest_base/clusters/hetzner-prod/projects/${project_key}-${project_type}/environments/current/values.yaml"
    
    echo "> Looking for values.yaml at: $values_file"
    
    if [[ ! -f "$values_file" ]]; then
        echo "ERROR: values.yaml not found: $values_file"
        echo "Available manifest directories:"
        ls -la "$manifest_base/clusters/hetzner-prod/projects/" 2>/dev/null || echo "Manifest base directory not found"
        return 1
    fi
    
    echo "✓ Found values.yaml: $values_file"
    
    # Path to env.json in build directory
    local build_env_file="build/${version}/env.json"
    echo "> Looking for env.json at: $build_env_file"
    
    if [[ ! -f "$build_env_file" ]]; then
        echo "ERROR: env.json not found in build directory: $build_env_file"
        echo "Available files in build directory:"
        ls -la "build/${version}/" 2>/dev/null || echo "Build directory not found"
        return 1
    fi
    
    echo "✓ Found env.json: $build_env_file"
    
    # FIRST: Update version in the build env.json file
    echo "> Updating version in build env.json..."
    if sed -i '' 's/"version"[[:space:]]*:[[:space:]]*"[^"]*"/"version": "'"$version"'"/g' "$build_env_file"; then
        echo "✓ Updated version in $build_env_file"
    else
        echo "ERROR: Failed to update version in env.json"
        return 1
    fi
    
    # Create backup of values.yaml
    cp "$values_file" "${values_file}.backup"
    echo "✓ Created backup: ${values_file}.backup"
    
    # Update the image tag directly (look for "tag:" with any indentation)
    echo "> Updating image tag in values.yaml..."
    if sed -i '' 's/^  tag: .*/  tag: '"$version"'  # Update this to current release tag/' "$values_file"; then
        echo "✓ Updated image tag to: $version"
    else
        echo "ERROR: Failed to update image tag"
        return 1
    fi
    
    # Format env.json content for YAML data section (with proper 4-space indentation)
    echo "> Formatting env.json for YAML data section..."
    local formatted_data
    formatted_data=$(cat "$build_env_file" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    # Format JSON with 2-space indentation for readability
    formatted = json.dumps(data, indent=2)
    # Add 4-space YAML indentation for each line
    lines = formatted.split('\n')
    for line in lines:
        print('    ' + line)  # 4 spaces for YAML indentation under 'data: |'
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
")
    
    if [[ $? -ne 0 ]]; then
        echo "ERROR: Failed to format env.json data"
        return 1
    fi
    
    echo "✓ Formatted env.json for YAML"
    
    # Replace the entire data section in injectFiles
    echo "> Replacing injectFiles data section..."
    
    # Create temporary file with the formatted data
    local temp_data=$(mktemp)
    echo "$formatted_data" > "$temp_data"
    
    # Use awk to replace everything between "data: |" and the next top-level key
    # Looking for the pattern with 2-space indent for "data: |"
    if awk -v data_file="$temp_data" '
/^  data: \|/ {
    # Found the data section, print the line itself
    print
    # Output the new content from file
    while ((getline line < data_file) > 0) {
        print line
    }
    close(data_file)
    # Skip old data lines (4+ spaces or empty) until we hit something else
    while (getline > 0) {
        # If line starts with 0-2 spaces (not part of data block), print it and continue
        if ($0 !~ /^    / && $0 !~ /^$/) {
            print
            break
        }
    }
    next
}
{ print }
' "$values_file" > "${values_file}.tmp" && mv "${values_file}.tmp" "$values_file"; then
        echo "✓ Replaced injectFiles data with new env.json content"
    else
        echo "ERROR: Failed to replace data section"
        rm -f "$temp_data"
        return 1
    fi
    
    # Clean up
    rm -f "$temp_data"
    
    # Show what was updated
    echo "> Verifying updates..."
    echo "Image tag in values.yaml:"
    grep "tag:" "$values_file" | head -1 || echo "No tag found"
    echo "Version in data section:"
    grep '"version"' "$values_file" | head -1 || echo "No version found"
    
    # Git operations in manifest directory
    local manifest_dir=$(dirname "$values_file")
    echo "> Committing manifest changes in: $manifest_dir"
    
    if cd "$manifest_dir"; then
        # Add the updated values.yaml
        if git add values.yaml; then
            echo "✓ Added values.yaml to git"
        else
            echo "ERROR: Failed to add values.yaml to git"
            cd - > /dev/null
            return 1
        fi
        
        # Check if there are changes to commit
        if git diff --cached --quiet; then
            echo "✓ No changes to commit in manifest"
        else
            # Commit with version as message
            if git commit -m "$version"; then
                echo "✓ Committed manifest changes with message: $version"
                
                # Push to remote
                if git push; then
                    echo "✓ Pushed manifest changes to remote"
                else
                    echo "WARNING: Failed to push manifest changes. You may need to push manually."
                fi
            else
                echo "ERROR: Failed to commit manifest changes"
                cd - > /dev/null
                return 1
            fi
        fi
        
        cd - > /dev/null
        echo "✓ Manifest update completed"
    else
        echo "ERROR: Failed to change to manifest directory: $manifest_dir"
        return 1
    fi
}

# Handle release creation if requested
if [[ "$CREATE_RELEASE" == "true" ]]; then
    echo ""
    echo "Creating release..."
    
    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "ERROR: Not in a git repository. Cannot create release."
        exit 1
    fi
    
    # Check if gh CLI is available
    if ! command -v gh >/dev/null 2>&1; then
        echo "ERROR: GitHub CLI (gh) not found. Please install it to create releases."
        echo "See: https://cli.github.com/"
        exit 1
    fi

    # Always add build artifacts and commit if there are any changes
    echo "> Staging build artifacts..."
    
    # Explicitly add the build directory (in case it's gitignored)
    git add -f build/${VERSION}/
    
    # Also add any other changes
    git add .
    
    # Check if there are any staged changes
    if ! git diff --cached --quiet; then
        echo "> Committing build artifacts..."
        git commit -m "${VERSION}"
        echo "✓ Committed build artifacts for version ${VERSION}"
    else
        echo "> No changes to commit"
    fi
    
    # Push to main branch
    echo "> Pushing to origin main..."
    git push origin main
    echo "✓ Pushed to origin main"
    
    # Create GitHub release
    echo "> Creating GitHub release..."
    if gh release create "${VERSION}" --target main --generate-notes; then
        echo "✓ GitHub release created: ${VERSION}"
        echo ""
        echo "Release complete! Your deployment pipeline should now be running."
        echo "Watching GitHub Actions workflow..."
        echo ""

        # Wait 2 seconds for GitHub Actions to start
        sleep 2
        
        # Watch the GitHub Actions workflow in real-time
        gh run watch
        
        # Update Argo CD manifests after successful release AND workflow completion
        echo ""
        echo "=== UPDATING ARGO CD MANIFESTS ==="
        echo "Version: $VERSION"
        echo "Project Type: $PROJECT_TYPE"
        echo "===================================="
        
        if update_argo_manifests "$VERSION" "$PROJECT_TYPE"; then
            echo "✓ Argo CD manifests updated successfully"
            echo "✓ Complete deployment pipeline finished!"
        else
            echo "ERROR: Failed to update Argo CD manifests"
            echo "The GitHub release and workflow completed successfully, but manifest update failed."
            echo "You may need to update the manifests manually."
            exit 1
        fi
    else
        echo "✗ Failed to create GitHub release"
        echo "You may need to authenticate with GitHub CLI first:"
        echo "  gh auth login"
        exit 1
    fi
else
    echo ""
    echo "To create a release, run:"
    echo "  git add build/"
    echo "  git commit -m '${VERSION}'"
    echo "  git push origin main"
    echo "  gh release create ${VERSION} --target main --generate-notes"
    echo ""
    echo "Or use: ./build.sh ${VERSION} --release"
fi