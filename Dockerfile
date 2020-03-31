FROM keybaseio/client:nightly-node-slim
WORKDIR /app
COPY . /app
RUN yarn
CMD ["node", "index.js"]
