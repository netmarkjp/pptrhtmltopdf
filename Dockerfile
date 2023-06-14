FROM node:18.16-bookworm
LABEL author="Toshiaki Baba<toshiaki@netmark.jp>"

# install chromium dependencies
RUN apt-get update \
    && apt-get -y install \
        libxcomposite1 \
        libxcursor1 \
        libxi6 \
        libxtst6 \
        libnss3 \
        libcups2 \
        libxss1 \
        libxrandr2 \
        libasound2 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libgtk-3-0 \
        libx11-xcb1 \
        libdrm2 \
        libgbm1 \
        poppler-utils \
        fonts-noto-cjk \
        fonts-noto-cjk-extra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY . /root/pptrhtmltopdf

ENV CHROME_VERSION=116.0.5829.0
#ENV CHROME_VERSION=latest

RUN npx @puppeteer/browsers install chrome@$CHROME_VERSION
RUN npx @puppeteer/browsers install chromedriver@$CHROME_VERSION
RUN cd /root/pptrhtmltopdf \
    && npm install pptrhtmltopdf \
    && ln -s /root/pptrhtmltopdf/node_modules/.bin/pptrhtmltopdf /usr/local/bin/pptrhtmltopdf

ENTRYPOINT ["/usr/local/bin/pptrhtmltopdf", "--no-sandbox"]
