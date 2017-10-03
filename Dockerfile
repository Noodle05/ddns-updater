FROM node:6.11.3-alpine

COPY package.json /src/package.json
RUN cd /src \
 && npm install

COPY index.js /src

CMD [ "node", "/src/index.js" ]
