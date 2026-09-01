FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-impress fonts-dejavu-core python3 python3-pip poppler-utils tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng \
  && python3 -m pip install --no-cache-dir --break-system-packages pdf2docx \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . ./
RUN npm run prepare:conversion-assets
# Worker yalnızca dönüşüm uçlarını kullanır. Next.js'in build sırasında diğer
# route modüllerini değerlendirebilmesi için gerçek veritabanına erişmeyen bir
# yer tutucu yeterlidir; bu değer çalışma zamanı imajına ENV olarak eklenmez.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
