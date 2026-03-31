FROM python:3.11-slim

RUN pip install --no-cache-dir instaloader flask schedule

WORKDIR /scripts

CMD ["python3", "/scripts/agendador.py"]
