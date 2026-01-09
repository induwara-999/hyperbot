FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8600
CMD ["node", "hyperbot.js"]
