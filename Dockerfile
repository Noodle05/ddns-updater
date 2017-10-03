FROM arm32v7/node:6.11.3

COPY package.json /src/package.json
RUN cd /src \
 && npm install

COPY index.js /src

CMD [ "node", "/src/index.js" ]
