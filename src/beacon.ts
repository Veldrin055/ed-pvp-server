interface Location {
  systemName: string
  x: number
  y: number
  z: number
}

export interface BeaconMessage {
  cmdr: string
  location: Location
}

export class Beacon {
  private beacon = new Map<string, BeaconMessage>()

  getAll(): BeaconMessage[] {
    const values: BeaconMessage[] = []
    this.beacon.forEach((value) => values.push(value))
    return values
  }

  set(data: BeaconMessage) {
    this.beacon.set(data.cmdr, data)
  }

  remove(cmdr: string) {
    this.beacon.delete(cmdr)
  }
}

