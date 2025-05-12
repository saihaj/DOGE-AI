#!/bin/bash
set -e

# Script to load environment variables from .env file, generate Envoy config, and start Envoy
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
ENV_FILE="${SCRIPT_DIR}/.env"
TMPL_FILE="${SCRIPT_DIR}/envoy.template.yaml"
CONFIG_FILE="${SCRIPT_DIR}/envoy.yaml"

# Check if the .env file exists and load environment variables
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from ${ENV_FILE}"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Warning: .env file not found at ${ENV_FILE}. Using environment variables from Docker."
fi

# Check if required variables are set
required_vars=("JWKS_APP_ID" "JWKS_ISSUER" "JWKS_REMOTE_URL")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: Required environment variable $var is not set"
    exit 1
  fi
  echo "Using $var=${!var}"
done

# Generate Envoy configuration by substituting environment variables
echo "Generating Envoy configuration from ${TMPL_FILE} to ${CONFIG_FILE}"
envsubst < "$TMPL_FILE" > "$CONFIG_FILE"

# Validate the generated configuration
echo "Validating generated Envoy configuration"
envoy --mode validate -c "$CONFIG_FILE"
if [ $? -ne 0 ]; then
  echo "Error: Generated Envoy configuration is invalid"
  exit 1
fi

echo "Starting Envoy with config from ${CONFIG_FILE}"

# Start Envoy with debug log levels
exec envoy -c "${CONFIG_FILE}" \
  --component-log-level health_checker:info,http:info,jwt:info
