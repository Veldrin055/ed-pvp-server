import * as express from 'express'
import * as WebSocket from 'ws'
import {Beacon, BeaconMessage} from "./beacon"

const app = express()
const server = app.listen(3000)
const wss = new WebSocket.Server({ server })
const beacon = new Beacon()

interface DataMessage {
  type: 'beacon'
  msg: BeaconMessage
}

wss.on('connection', ws => {

  let latest: string

  ws.on('open', () => ws.send(beacon.getAll()))

  ws.on('message', (data: DataMessage) => {
    if (data.type === 'beacon') {
      beacon.set(data.msg)
      latest = data.msg.cmdr
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === WebSocket.OPEN) {
          cl.send(data.msg)
        }
      })
    }
  })

  ws.on('close', () => { if (latest) beacon.remove(latest) })

})
console.log('Server started')