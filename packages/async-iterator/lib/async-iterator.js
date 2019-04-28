const DefaultBindings = require('@serialport/bindings')
const debug = require('debug')('serialport/async-iterator')
/**
 * A transform stream that does something pretty cool.
 * @param {Object} options open options
 * @example ```
// To use the `AsyncIterator` interface:
const { open, list } = require('@serialport/async-iterator')
const ports = await list()
const arduinoPort = ports.find(info => (info.manufacture || '').includes('Arduino'))
const port = await open(arduinoPort)

// read bytes until close
for await (const bytes of port) {
  console.log(`read ${bytes.length} bytes`)
}

// read 12 bytes
const { value, end } = await port.next(12)
console.log(`read ${value.length} bytes / port closed: ${end}`)

// write a buffer
await port.write(Buffer.from('hello!'))
```
*/

module.exports.open = async ({ Bindings = DefaultBindings, readSize = 1024, ...openOptions } = {}) => {
  const port = new Bindings()
  await port.open(openOptions)

  const next = async (bytesToRead = readSize) => {
    if (!port.isOpen) {
      debug('next: port is closed')
      return { value: undefined, end: true }
    }

    const readBuffer = Buffer.allocUnsafe(bytesToRead)
    try {
      debug(`next: read starting`)
      const bytesRead = await port.read(readBuffer, 0, bytesToRead)
      debug(`next: read ${bytesRead} bytes`)
      const value = readBuffer.slice(0, bytesRead)
      return { value, end: false }
    } catch (error) {
      if (error.canceled) {
        debug(`next: read canceled`)
        return { value: undefined, end: true }
      }
      debug(`next: read error ${error.message}`)
      throw error
    }
  }

  const asyncIterableIterator = {
    [Symbol.asyncIterator]: () => asyncIterableIterator,
    next,
    write: (data) => port.write(data),
    close: () => port.close(),
    update: opt => port.update(opt),
    set: opt => port.set(opt),
    get: () => port.get(),
    flush: () => port.flush(),
    drain: () => port.drain(),
  }
  return asyncIterableIterator
}

module.exports.DefaultBindings.list
