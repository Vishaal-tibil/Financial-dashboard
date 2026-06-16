# Backend — FastAPI / uvicorn
# Build context: FD/   (one level above this file)
# docker build -f Dockerfile -t financial-dashboard-backend .   (run from FD/)

FROM python:3.11-slim

WORKDIR /app

# gcc needed by some numpy/pandas wheel builds on slim images
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps in a separate layer so they are cached across code-only changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# data/ and uploads/ are mounted as Docker volumes in production;
# create them here so the image starts cleanly without seed files
RUN mkdir -p data uploads

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/status')" \
    || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
