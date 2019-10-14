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
  type: string
  msg: any 
}

interface BeaconDataMessage extends DataMessage{
  type: 'beacon'
  msg: BeaconMessage
}

type KeepAliveSocket = WebSocket & { isAlive: boolean }

wss.on('connection', (ws: KeepAliveSocket) => {

  let cmdr: string
  ws.isAlive = true
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (dataStr: string) => {
    const data: DataMessage = JSON.parse(dataStr)

    const { type, msg } = data as BeaconDataMessage
    if (type === 'beacon') {

      if (!cmdr) { // Send the contents of the beacon on first submission received
        ws.send(JSON.stringify({ type: 'beacon', msg: beacon.getAll() }))  
      }

      cmdr = msg.cmdr
      beacon.set(msg)
      console.log(`update ${cmdr}`, data)

      broadcast({ type, msg: [msg] })
    } else if (type === 'beacon_remove') {
      remove()
    }
  })

  ws.on('close', () => remove())

  const remove = () => {
    if (cmdr) {
      console.log(`disconnecting ${cmdr}`)
      beacon.remove(cmdr)
      cmdr = ''
      broadcast({type: 'beacon_remove', msg: cmdr})
    }
  }

  // Send to all clients except this one
  const broadcast = (data: DataMessage) => wss.clients.forEach(cl => {
    if (cl !== ws && cl.readyState === WebSocket.OPEN) {
      cl.send(JSON.stringify(data))
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