FROM node:15

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
