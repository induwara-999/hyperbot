FROM ghcr.io/puppeteer/puppeteer:21.6.1

USER root

# සර්වර් එකේ working directory එක හදනවා
WORKDIR /app

# Package ෆයිල්ස් කොපි කරලා ඉන්ස්ටෝල් කරනවා
COPY package*.json ./
RUN npm install

# ඉතිරි කෝඩ් එක කොපි කරනවා
COPY . .

# සර්වර් එකේ පෝට් එක open කරනවා
EXPOSE 8600

# බොට් එක ස්ටාර්ට් කරනවා
CMD ["node", "hyperbot.js"]
