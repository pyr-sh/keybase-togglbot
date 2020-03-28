FROM keybaseio/client:stable-node-slim
WORKDIR /app
COPY . /app
RUN yarn
CMD ["node", "index.js"]
