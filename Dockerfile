FROM ghcr.io/puppeteer/puppeteer:21.6.1

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8600
CMD ["node", "hyperbot.js"]
