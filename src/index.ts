import * as express from 'express'
import * as WebSocket from 'ws'
import {Beacon, BeaconMessage} from "./beacon"
import * as nconf from 'nconf'

nconf
  .argv()
  .defaults({
  port: 3000
})

const port = nconf.get('port')
const app = express()
const server = app.listen(port)
const wss = new WebSocket.Server({ server })
const beacon = new Beacon()

interface DataMessage {
  type: 'beacon'
  msg: BeaconMessage
}

wss.on('connection', ws => {

  let latest: string

  ws.on('open', () => ws.send({ type: 'beacon', msg: beacon.getAll()} ))

  ws.on('message', (dataStr: string) => {
    const data: DataMessage = JSON.parse(dataStr)
    if (data.type === 'beacon') {
      const { type, msg } = data
      beacon.set(msg)
      latest = msg.cmdr
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === WebSocket.OPEN) {
          cl.send({ type, msg })
        }
      })
    }
  })

  ws.on('close', () => {
    if (latest) {
      beacon.remove(latest)
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === WebSocket.OPEN) {
          cl.send({ type: 'beacon_remove', msg: latest })
        }
      })
    }
})

})
console.log(`Server started on port ${port}`)