FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-impress fonts-dejavu-core python3 python3-pip \
  && python3 -m pip install --no-cache-dir --break-system-packages pdf2docx \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . ./
RUN npm run prepare:conversion-assets
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
