#!/usr/bin/env node
const Bot = require('keybase-bot')
const moment = require('moment')
const axios = require('axios').default
const secrets = require('./secrets.js')

const togglAPI = axios.create({
  baseURL: 'https://toggl.com',
  headers: {
    'Authorization': `Basic ${Buffer.from(`${secrets.toggl.api_key}:api_token`).toString('base64')}`,
  },
})

const bot = new Bot()

async function main() {
  try {
    await bot.init(secrets.keybase.username, secrets.keybase.paperkey)

    const info = bot.myInfo()
    console.log(`Bot initialized with username ${info.username}.`)

    // await bot.chat.clearCommands()
    await bot.chat.advertiseCommands({
      advertisements: [
        {
          type: 'public',
          commands: [
            {
              name: 'toggl',
              description: 'Talks with the Toggl API',
              usage: '(budget | help)',
            },
          ],
        },
      ],
    })

    console.log(`Listening for all messages...`)
    await bot.chat.watchAllChannelsForNewMessages(
      async msg => {
        try {
          // Ignore non-text messages
          if (msg.content.type !== 'text') {
            return
          }

          // Ignore replies
          if (!msg.content.text.body.startsWith('!toggl ')) {
            return
          }

          // At this point we're certain the user is trying to interact with the bot
          const parts = msg.content.text.body.split(' ')
          if (parts[1] === 'budget') {
            const queriedMonth = parts[2] || moment().format('MMMM')

            // Requesting the budget!
            try {
              let agg = {}
              let totalProcessed = 0
              let totalCount = 0
              let page = 1

              while (true) {
                const res = await togglAPI.get('/reports/api/v2/details', {
                  params: {
                    'user_agent': 'bot+toggl@zduniak.net',
                    'workspace_id': secrets.toggl.workspace_id,
                    'project_ids': secrets.toggl.project_id,
                    'since': moment(queriedMonth, 'MMMM').startOf('month').format('YYYY-MM-DD'),
                    'until': moment(queriedMonth, 'MMMM').endOf('month').format('YYYY-MM-DD'),
                    'display_hours': 'decimal',
                    'page': page,
                  },
                })

                totalCount = res.data.total_count
                agg = res.data.data.map(item => ({
                  uid: item.uid.toString(), // we operate on string ids in this script
                  dur: item.dur,
                })).reduce((prev, cur) => {
                  if (prev[cur.uid] === undefined) {
                    prev[cur.uid] = 0
                  }
                  prev[cur.uid] += cur.dur
                  return prev
                }, agg)
                totalProcessed += res.data.data.length
                page++

                if (totalProcessed >= totalCount) {
                  break
                }
              }

              // At this point we've completed the processing, calculate the sums
              const table = []
              const names = []
              for (const [uid, value] of Object.entries(agg)) {
                const name = secrets.names[uid]
                names.push(name)

                const rate = secrets.rates[uid]
                const hours = value / 1000 / 60 / 60 // convert from ms into a float
                table.push({
                  name,
                  rate,
                  hours,
                  amount: rate * hours,
                })
              }

              // For now we'll simply aggregate the table and hide the breakdown
              const joinedNames = [names.slice(0, -1).join(', '), names.slice(-1)[0]].join(names.length < 2 ? '' : ' and ')
              const totalHours = table.map(row => row.hours).reduce((a, b) => a + b, 0).toFixed(3)
              const totalAmount = table.map(row => row.amount).reduce((a, b) => a + b, 0).toFixed(2)

              bot.chat.send(msg.conversationId, {
                body: `This month ${joinedNames} worked ${totalHours}h for a total cost of $${totalAmount}`,
              })
            } catch(e) {
              if (e.responseBody) {
                console.error(e)
                const body = await e.responseBody
                console.error(`Body: ${body}`)
                return
              }
              throw e
            }

            return
          }
          if (parts[1] === 'help') {
            if (msg.channel.name === secrets.acl.team || msg.channel.name.startsWith(`${secrets.acl.team}.`)) {
              bot.chat.send(msg.conversationId, {
                body: `Usage: \`!toggl budget\` to get the amount for the current month.`,
              })
              return
            }

            bot.chat.send(msg.conversationId, {
              body: `Hello! I'm @${info.username}, currently only configured to serve the internal chat ops at @${secrets.acl.team}. Message @pzduniak if you're interested in a Toggl - Keybase integration.`
            })
            return
          }
          console.log(msg)

        } catch (err) {
          console.error(err)
        }
      },
      e => console.error(e)
    )
  } catch (error) {
    console.error(error)
  }
}

async function shutdown() {
  await bot.deinit()
  process.exit()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

main()