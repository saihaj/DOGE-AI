FROM debian:bullseye-slim

# Install dependencies for Envoy
RUN apt-get update && apt-get install -y wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Envoy (latest version 1.34.0)
RUN wget -O /usr/local/bin/envoy https://github.com/envoyproxy/envoy/releases/download/v1.34.0/envoy-1.34.0-linux-x86_64 && \
    chmod +x /usr/local/bin/envoy

# Create necessary directories
RUN mkdir -p /etc/envoy

# Copy Envoy configuration
COPY envoy.yaml /etc/envoy/envoy.yaml

# Expose ports for Envoy (8080, 9901)
EXPOSE 8080 9901

# Run Envoy with the configuration
CMD ["/usr/local/bin/envoy", "-c", "/etc/envoy/envoy.yaml", "--log-level", "info"]
