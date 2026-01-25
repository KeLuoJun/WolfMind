# syntax=docker/dockerfile:1

FROM python:3.13-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        "agentscope>=0.1.0" \
        "dashscope>=1.14.0" \
        "fastapi>=0.110.0" \
        "numpy>=1.24.0" \
        "openai>=1.0.0" \
        "pydantic>=2.0.0" \
        "typing-extensions>=4.5.0" \
        "uvicorn[standard]>=0.27.0"

COPY . .

ENV PYTHONPATH=/app/backend:/app

EXPOSE 8000

CMD ["uvicorn", "backend.api_server:app", "--host", "0.0.0.0", "--port", "8000"]

FROM node:20-alpine AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
