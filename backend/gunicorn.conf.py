"""
FIRENEXUS Staging / Production Gunicorn Configuration
Provides hardened WSGI server configuration for Linux staging and production deployments.
"""

import multiprocessing
import os

# Server socket
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
# Standard calculation: (2 * CPUs) + 1, capped appropriately for container memory
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"
threads = int(os.getenv("GUNICORN_THREADS", 2))
worker_connections = 1000
timeout = 60
keepalive = 5

# Process naming
proc_name = "firenexus_api_staging"

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info").lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'

# Lifecycle hooks
def on_starting(server):
    server.log.info("Starting FIRENEXUS Staging WSGI Server (Gunicorn)...")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")
