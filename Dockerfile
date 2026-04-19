### STAGE 1: Build ###

# We label our stage as ‘builder’
FROM node:14.21.2-alpine as builder

RUN npm install -g ionic cordova@8.0.0

WORKDIR /app

COPY . ./

RUN npm install

RUN mkdir -p ./www

RUN cordova platform add browser@latest

RUN ionic cordova build browser
RUN sed -i 's#<script src="cordova.js"></script>##g; s#<script src="cordova.js" defer></script>##g' /app/platforms/browser/www/index.html

### STAGE 2: Setup ###

FROM nginx:1.14.1-alpine as setup

## Copy our default nginx config
COPY nginx.conf /etc/nginx/nginx.conf

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/platforms/browser/www/ /usr/share/nginx/html
COPY --from=builder /app/src/chat-config-template.json /usr/share/nginx/html
COPY --from=builder /app/src/firebase-messaging-sw-template.js /usr/share/nginx/html



WORKDIR /usr/share/nginx/html

RUN echo "Chat21 Ionic Started!!"

CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/chat-config-template.json > /usr/share/nginx/html/chat-config.json && envsubst < /usr/share/nginx/html/firebase-messaging-sw-template.js > /usr/share/nginx/html/firebase-messaging-sw.js && exec nginx -g 'daemon off;'"]


