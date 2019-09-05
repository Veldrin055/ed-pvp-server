import * as express from 'express'
import * as faye from 'faye'
import {setInterval} from "timers"

interface Location {
  systemName: string
  x: number
  y: number
  z: number
}

interface BeaconMessage {
  cmdr: string
  location: Location
}

const app = express()
const bayeux = new faye.NodeAdapter({ mount: '/faye', timeout: 45 })
const server = app.listen(3000)
bayeux.attach(server)

const beacon = new Map<string, BeaconMessage>()

const client = new faye.Client('http://localhost:3000/faye')
client.subscribe('/beacon', (message: BeaconMessage) => beacon.set(message.cmdr, message))