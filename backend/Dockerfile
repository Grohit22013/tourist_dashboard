# Instead of python:3.10-slim (which is failing with exec format error),
# use a plain Ubuntu base image and install Python manually.
FROM ubuntu:22.04

# Avoid any interactive prompts during apt
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3 + pip + some basic tools
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    ln -s /usr/bin/python3 /usr/local/bin/python && \
    pip3 install --upgrade pip && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your FastAPI app
COPY ./app ./app

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
