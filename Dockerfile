FROM bitnami/node:16.16.0
WORKDIR /home/bitnami

# ./src is excluded, see .dockerignore
COPY . ./patton-server
EXPOSE 3000

ENV REDIS_SERVICE_HOST=redis

# start up the app as a daemon
CMD [ "node", "./patton-server/dist/index.js" ]