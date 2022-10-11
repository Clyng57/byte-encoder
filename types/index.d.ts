
import type ByteView from 'byteview'

declare module 'byte-encoder'

export class ByteEncoderIterator {
  #string: string
  #units: number
  #max: number
  #index: number
  #component: Array<*>
  #leadSurrogate: null | number
  #codePoint: null | number
  #componentError: [0xEF, 0xBF, 0xBD]
  #read: number

  constructor (string: string, units?: number)

  get [Symbol.toStringTag] () {
    return 'ByteEncoder'
  }

  get read (): number

  [Symbol.iterator] () {
    return this
  }

  next (): { value: number | undefined, done: boolean }
}

export default class ByteEncoder {
  #encoding: string

  static Iterator = ByteEncoderIterator

  constructor ()

  get encoding (): string

  encodeToBuffer (string: string): ArrayBufferLike

  encode (string: string): ByteView

  encodeInto (
    string: string,
    byteView: ByteView | Buffer | ArrayBufferView
  ): { read: number, written: number }
}
