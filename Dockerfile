FROM python:3.12-slim

WORKDIR /app

COPY index.html styles.css script.js server.py /app/

RUN mkdir -p /app/data

EXPOSE 4173

CMD ["python3", "server.py"]
