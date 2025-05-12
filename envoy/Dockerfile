FROM debian:bullseye-slim

# Install dependencies for Envoy
RUN apt-get update && apt-get install -y wget ca-certificates gettext-base && rm -rf /var/lib/apt/lists/*

# Install Envoy (latest version 1.34.0)
RUN wget -O /usr/local/bin/envoy https://github.com/envoyproxy/envoy/releases/download/v1.34.0/envoy-1.34.0-linux-x86_64 && \
    chmod +x /usr/local/bin/envoy

# Create necessary directories
RUN mkdir -p /etc/envoy

# Copy Envoy configuration and run script
COPY envoy.template.yaml /etc/envoy/envoy.template.yaml
COPY run_envoy.sh /etc/envoy/run_envoy.sh
RUN chmod +x /etc/envoy/run_envoy.sh

# Expose ports for Envoy (8080, 9901)
EXPOSE 8080 9901

# Run Envoy with the script
CMD ["/etc/envoy/run_envoy.sh"]
