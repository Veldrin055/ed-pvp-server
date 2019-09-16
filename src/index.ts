import * as express from 'express'
import * as WebSocket from 'ws'
import {Beacon, BeaconMessage} from "./beacon"
import * as nconf from 'nconf'

nconf
  .argv()
  .defaults({
  port: 3000
})

const port = process.env.PORT ? process.env.PORT : nconf.get('port')
const app = express()
const server = app.listen(process.env.PORT || port)
const wss = new WebSocket.Server({ server })
const beacon = new Beacon()

interface DataMessage {
  type: 'beacon'
  msg: BeaconMessage
}

type KeepAliveSocket = WebSocket & { isAlive: boolean }

wss.on('connection', (ws: KeepAliveSocket) => {

  let latest: string
  ws.isAlive = true
  ws.on('pong', () => ws.isAlive = true);
  ws.on('open', () => ws.send({ type: 'beacon', msg: beacon.getAll()} ))

  ws.on('message', (dataStr: string) => {
    const data: DataMessage = JSON.parse(dataStr)
    if (data.type === 'beacon') {
      const { type, msg } = data
      beacon.set(msg)
      latest = msg.cmdr
      console.log(`update ${latest}`, data)
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === WebSocket.OPEN) {
          cl.send({ type, msg })
        }
      })
    }
  })

  ws.on('close', () => {
    if (latest) {
      console.log(`disconnecting ${latest}`)
      beacon.remove(latest)
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === WebSocket.OPEN) {
          cl.send({ type: 'beacon_remove', msg: latest })
        }
      })
    }
})

})

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    const socket = ws as KeepAliveSocket
    if (socket.isAlive === false) return ws.terminate();

    socket.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

console.log(`Server started on port ${port}`)