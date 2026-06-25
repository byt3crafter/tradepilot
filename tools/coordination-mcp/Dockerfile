FROM python:3.12-slim

WORKDIR /app

# sqlite3 CLI so bus.sh / watch_done.sh can read the board directly via `docker exec`.
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# SQLite DB lives on a mounted volume so the board survives restarts.
ENV COORD_DB=/data/coordination.db
ENV COORD_HOST=0.0.0.0
ENV COORD_PORT=8766

EXPOSE 8766

CMD ["python", "server.py"]
