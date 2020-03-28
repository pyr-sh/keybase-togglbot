# keybase-togglbot

A very simple Keybase bot that aggregates monthly reports from Toggl. Sums up
all of the report items, multiplies them by their rates and prints out a total
sum. Useful for PM chats with clients at software development agencies that use
Toggl for internal time tracking.

## Configuration

Running this codebase requires you to prepare a `secrets.js` file with all the
configuration details. This will eventually be replaced by a database, env vars
and Keybase's key-value store.

## Running locally

This project is designed to run in Docker with a mounted config file, but for
development purposes a simpler, "native" setup is preferred. Create the `secrets.js`
file in the root of this repo and run the following commands to start the service:

```bash
yarn
node index.js
```

## Deployment

There's an automated Docker Hub build pipeline pointed at this repo. In order to
run the bot on a server, you need to prepare the `secrets.js` file and run the
following command:

```bash
docker run -d \
    --restart always \
    --name togglbot \
    -v /opt/togglbot/secrets.js:/app/secrets.js \
    pzduniak/keybase-togglbot
```
