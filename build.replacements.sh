#!/bin/bash

# seed.replacements.sh - Replacement functions for seed script
# This module contains all the specific replacement logic that transforms
# template files with project-specific values during the seed process.

# Replace placeholders in app-specific files
replace_app_placeholders() {
    local app_root="$1"
    
    # Replace placeholders in Dockerfile
    if [[ -f "$app_root/Dockerfile" ]]; then
        replace_placeholders "$app_root/Dockerfile" "APP Dockerfile ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
    fi
    
    # Replace placeholders in app.sh
    if [[ -f "$app_root/app.sh" ]]; then
        replace_placeholders "$app_root/app.sh" "APP app.sh ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
        
        replace_placeholders "$app_root/app.sh" "APP app.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
    fi
    
    # Replace placeholders in build.sh (all the placeholders for frontend building)
    if [[ -f "$app_root/build.sh" ]]; then
        replace_placeholders "$app_root/build.sh" "APP build.sh ([NAME] -> project name)" \
            "\\[NAME\\]" "$PROJECT_NAME"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([HOST] -> host)" \
            "\\[HOST\\]" "$HOST_NAME"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([HOST_TLD] -> host TLD)" \
            "\\[HOST_TLD\\]" "$HOST_TLD"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([HOST_NO_DOTS] -> host no dots)" \
            "\\[HOST_NO_DOTS\\]" "$HOST_NO_DOTS"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([HOST_TLD_NO_DOTS] -> host TLD no dots)" \
            "\\[HOST_TLD_NO_DOTS\\]" "$HOST_TLD_NO_DOTS"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([PORT] -> port)" \
            "\\[PORT\\]" "$PORT"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([PARAM_KEY] -> key)" \
            "\\[PARAM_KEY\\]" "$PARAM_KEY"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
        
        replace_placeholders "$app_root/build.sh" "APP build.sh ([PROJECT_TYPE] -> project type)" \
            "\\[PROJECT_TYPE\\]" "$PROJECT_TYPE"
    fi
    
    # Replace placeholders in other build scripts
    if [[ -f "$app_root/build.health.sh" ]]; then
        replace_placeholders "$app_root/build.health.sh" "APP build.health.sh ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
    fi
    
    if [[ -f "$app_root/build.deploy.sh" ]]; then
        replace_placeholders "$app_root/build.deploy.sh" "APP build.deploy.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
    fi
    
    # Update package.json with project name
    replace_placeholders "$app_root/package.json" "APP package.json" \
        "\\[PARAM_NAME\\]" "$PROJECT_NAME"
}

# Replace placeholders in API-specific files
replace_api_placeholders() {
    local api_root="$1"
    
    # Replace placeholders in Dockerfile
    if [[ -f "$api_root/Dockerfile" ]]; then
        replace_placeholders "$api_root/Dockerfile" "API Dockerfile ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
    fi
    
    # Replace placeholders in app.sh
    if [[ -f "$api_root/app.sh" ]]; then
        replace_placeholders "$api_root/app.sh" "API app.sh ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
        
        replace_placeholders "$api_root/app.sh" "API app.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
    fi
    
    # Replace placeholders in build.sh (same as APP build.sh)
    if [[ -f "$api_root/build.sh" ]]; then
        replace_placeholders "$api_root/build.sh" "API build.sh ([NAME] -> project name)" \
            "\\[NAME\\]" "$PROJECT_NAME"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([HOST] -> host)" \
            "\\[HOST\\]" "$HOST_NAME"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([HOST_TLD] -> host TLD)" \
            "\\[HOST_TLD\\]" "$HOST_TLD"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([HOST_NO_DOTS] -> host no dots)" \
            "\\[HOST_NO_DOTS\\]" "$HOST_NO_DOTS"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([HOST_TLD_NO_DOTS] -> host TLD no dots)" \
            "\\[HOST_TLD_NO_DOTS\\]" "$HOST_TLD_NO_DOTS"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([PORT] -> port)" \
            "\\[PORT\\]" "$PORT"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([PARAM_KEY] -> key)" \
            "\\[PARAM_KEY\\]" "$PARAM_KEY"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
        
        replace_placeholders "$api_root/build.sh" "API build.sh ([PROJECT_TYPE] -> project type)" \
            "\\[PROJECT_TYPE\\]" "$PROJECT_TYPE"
    fi
    
    # Replace placeholders in other build scripts
    if [[ -f "$api_root/build.health.sh" ]]; then
        replace_placeholders "$api_root/build.health.sh" "API build.health.sh ([PARAM_PORT] -> port)" \
            "\\[PARAM_PORT\\]" "$PORT"
    fi
    
    if [[ -f "$api_root/build.deploy.sh" ]]; then
        replace_placeholders "$api_root/build.deploy.sh" "API build.deploy.sh ([PARAM_NAME] -> name)" \
            "\\[PARAM_NAME\\]" "$PROJECT_NAME"
    fi
    
    # Update package.json with project name
    replace_placeholders "$api_root/package.json" "API package.json" \
        "\\[PARAM_NAME\\]" "$PROJECT_NAME"
}

# Replace placeholders in environment files (shared between app and api)
replace_env_file_placeholders() {
    local project_root="$1"
    
    # Replace the 5 placeholders in the environment file:
    
    # 1. Replace [HOST] with --host
    replace_placeholders "$project_root/env.json" "env.json ([HOST] -> host)" \
        "\\[HOST\\]" "$HOST_NAME"
    
    # 2. Replace [HOST_TLD] with host's top level domain
    replace_placeholders "$project_root/env.json" "env.json ([HOST_TLD] -> host TLD)" \
        "\\[HOST_TLD\\]" "$HOST_TLD"
    
    # 3. Replace [HOST_NO_DOTS] with host without dots
    replace_placeholders "$project_root/env.json" "env.json ([HOST_NO_DOTS] -> host no dots)" \
        "\\[HOST_NO_DOTS\\]" "$HOST_NO_DOTS"
    
    # 4. Replace [HOST_TLD_NO_DOTS] with host's TLD without dots
    replace_placeholders "$project_root/env.json" "env.json ([HOST_TLD_NO_DOTS] -> host TLD no dots)" \
        "\\[HOST_TLD_NO_DOTS\\]" "$HOST_TLD_NO_DOTS"
    
    # 5. Replace [NAME] with project name
    replace_placeholders "$project_root/env.json" "env.json ([NAME] -> project name)" \
        "\\[NAME\\]" "$PROJECT_NAME"
    
    # Update port based on project type
    if [[ "$PROJECT_TYPE" == "app" ]]; then
        replace_placeholders "$project_root/env.json" "env.json port" \
            "9999" "$PORT"
    else
        replace_placeholders "$project_root/env.json" "env.json port" \
            "9999" "$PORT"
    fi
}

# Replace placeholders in clients.js files (uses BOTH local and production host values)
replace_clients_file_placeholders() {
    local clients_file="$1"
    local desc="$2"
    
    if [[ ! -f "$clients_file" ]]; then
        status_error "File not found for clients file placeholder replacement: $clients_file"
        return 1
    fi
    
    status_info "Replacing clients file placeholders in $desc..."
    
    # Replace LOCAL host placeholders first
    replace_placeholders "$clients_file" "$desc ([HOST_TLD] -> local host TLD)" \
        "\\[HOST_TLD\\]" "$HOST_TLD"
    
    # Replace PRODUCTION host placeholders
    replace_placeholders "$clients_file" "$desc ([HOST_PRODUCTION_TLD] -> production host TLD)" \
        "\\[HOST_PRODUCTION_TLD\\]" "$HOST_PRODUCTION_TLD"
    
    # Replace other common placeholders
    replace_placeholders "$clients_file" "$desc ([HOST] -> local host)" \
        "\\[HOST\\]" "$HOST_NAME"
    
    replace_placeholders "$clients_file" "$desc ([HOST_NO_DOTS] -> local host no dots)" \
        "\\[HOST_NO_DOTS\\]" "$HOST_NO_DOTS"
    
    replace_placeholders "$clients_file" "$desc ([HOST_TLD_NO_DOTS] -> local host TLD no dots)" \
        "\\[HOST_TLD_NO_DOTS\\]" "$HOST_TLD_NO_DOTS"
    
    replace_placeholders "$clients_file" "$desc ([PARAM_KEY] -> key)" \
        "\\[PARAM_KEY\\]" "$PARAM_KEY"
    
    replace_placeholders "$clients_file" "$desc ([PARAM_NAME] -> name)" \
        "\\[PARAM_NAME\\]" "$PROJECT_NAME"
    
    replace_placeholders "$clients_file" "$desc ([PROJECT_TYPE] -> project type)" \
        "\\[PROJECT_TYPE\\]" "$PROJECT_TYPE"
    
    replace_placeholders "$clients_file" "$desc ([PARAM_PORT] -> port)" \
        "\\[PARAM_PORT\\]" "$PORT"
    
    status_success "Completed clients file placeholder replacement in $desc"
}