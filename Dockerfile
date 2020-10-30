FROM node:14

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . /app

# EXPOSE 3011

EXPOSE 6379
EXPOSE 7777
# CMD [ concurrently "/usr/bin/redis-app --bind '0.0.0.0'" "sleep 5s; node /app/src/app.js", "npm", "start" ]