ARG BASE_IMAGE=node:6.11.3-alpine
FROM ${BASE_IMAGE}

COPY package.json /src/package.json
RUN cd /src \
 && npm install

COPY index.js /src

CMD [ "node", "/src/index.js" ]
