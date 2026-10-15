# One-off seeding container:  docker compose --profile seed run --rm seed
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /seed
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY postgres_seeder.py mongo_seeder.py ./
CMD ["sh", "-c", "python postgres_seeder.py --reset && python mongo_seeder.py --reset"]
