FROM node:12-buster
MAINTAINER Toshiaki Baba<baba@heartbeats.jp>

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
        poppler-utils \
        fonts-noto-cjk \
        fonts-noto-cjk-extra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
RUN cd /root/pptrhtmltopdf \
    && npm install pptrhtmltopdf \
    && ln -s /root/pptrhtmltopdf/node_modules/.bin/pptrhtmltopdf /usr/local/bin/pptrhtmltopdf

ENTRYPOINT ["/usr/local/bin/pptrhtmltopdf", "--no-sandbox"]
