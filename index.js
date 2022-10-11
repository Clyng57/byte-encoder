
import ByteView from 'byteview'

export class ByteEncoderIterator {
  #string
  #units
  #max
  #index
  #component = []
  #leadSurrogate = null
  #codePoint = null
  #componentError = [0xEF, 0xBF, 0xBD]
  #read = 0

  constructor (string, units) {
    if (typeof string !== 'string') {
      throw new TypeError('Expected typeof "string". Recieved typeof: "' + typeof string + '"')
    }
    this.#string = string
    this.#units = units || Infinity
    this.#max = string.length
    this.#index = -1
    this.next = this.next.bind(this)
  }

  /**
   *
   * @returns {ArrayBuffer}
   */
  get buffer () {
    return new ByteView(this).buffer
  }

  static encode (string = '') {
    return new ByteView(new ByteEncoderIterator(string))
  }

  get [Symbol.toStringTag] () {
    return 'ByteEncoder'
  }

  get read () {
    return this.#read
  }

  [Symbol.iterator] () {
    return this
  }

  next () {
    const result = { value: null, done: false }
    if (this.#component && Array.isArray(this.#component) && this.#component.length) {
      result.value = this.#component[0]
      this.#component = this.#component.length > 1 ? this.#component.slice(1) : null
      return result
    }
    ++this.#index
    // done
    if (this.#index >= this.#max) {
      return { value: undefined, done: true }
    }
    this.#codePoint = this.#string.charCodeAt(this.#index)
    // is surrogate component
    if (this.#codePoint > 0xD7FF && this.#codePoint < 0xE000) {
      // last char was a lead
      if (!this.#leadSurrogate) {
        // no lead yet
        if (this.#codePoint > 0xDBFF) {
          // unexpected trail
          if ((this.#units -= 3) > -1) {
            this.#component ? this.#component.push(this.#componentError) : this.#component = this.#componentError
            ++this.#read
            return this.next()
          }
          return this.next()
        } else if (this.#index + 1 === this.#max) {
          // unpaired lead
          if ((this.#units -= 3) > -1) {
            this.#component ? this.#component.push(this.#componentError) : this.#component = this.#componentError
            ++this.#read
            return this.next()
          }
          return this.next()
        }

        // valid lead
        this.#leadSurrogate = this.#codePoint

        return this.next()
      }

      // 2 leads in a row
      if (this.#codePoint < 0xDC00) {
        if ((this.#units -= 3) > -1) {
          this.#component ? this.#component.push(this.#componentError) : this.#component = this.#componentError
          return this.next()
        }
        this.#leadSurrogate = this.#codePoint
        return this.next()
      }

      // valid surrogate pair
      this.#codePoint = (this.#leadSurrogate - 0xD800 << 10 | this.#codePoint - 0xDC00) + 0x10000
    } else if (this.#leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((this.#units -= 3) > -1) {
        this.#component ? this.#component.push(this.#componentError) : this.#component = this.#componentError
        return this.next()
      }
    }
    this.#leadSurrogate = null

    // encode utf8
    if (this.#codePoint < 0x80) {
      if ((this.#units -= 1) < 0) return { value: undefined, done: true }
      ++this.#read
      result.value = this.#codePoint
    } else if (this.#codePoint < 0x800) {
      if ((this.#units -= 2) < 0) return { value: undefined, done: true }
      ++this.#read
      this.#component = [
        this.#codePoint >> 0x6 | 0xC0,
        this.#codePoint & 0x3F | 0x80
      ]
      return this.next()
    } else if (this.#codePoint < 0x10000) {
      if ((this.#units -= 3) < 0) return { value: undefined, done: true }
      ++this.#read
      this.#component = [
        this.#codePoint >> 0xC | 0xE0,
        this.#codePoint >> 0x6 & 0x3F | 0x80,
        this.#codePoint & 0x3F | 0x80
      ]
      return this.next()
    } else if (this.#codePoint < 0x110000) {
      if ((this.#units -= 4) < 0) return { value: undefined, done: true }
      ++this.#read
      this.#component = [
        this.#codePoint >> 0x12 | 0xF0,
        this.#codePoint >> 0xC & 0x3F | 0x80,
        this.#codePoint >> 0x6 & 0x3F | 0x80,
        this.#codePoint & 0x3F | 0x80
      ]
      return this.next()
    } else {
      throw new Error('Invalid code point')
    }

    return result
  }
}

export default class ByteEncoder {
  #encoding

  static Iterator = ByteEncoderIterator

  constructor () {
    this.#encoding = 'utf-8'
  }

  get encoding () {
    return this.#encoding
  }

  encodeToBuffer (string = '') {
    return new ByteView(new ByteEncoderIterator(string)).buffer
  }

  encode (string = '') {
    return new ByteView(new ByteEncoderIterator(string))
  }

  encodeInto (string, byteView) {
    if (!ByteView.isByteView(byteView) && !ByteView.isView(byteView) && !isBuffer(byteView)) {
      throw new TypeError('Expected instance of "ByteView | TypedArray | Buffer"')
    }
    let bvIndex = -1
    const { length } = byteView
    const textEncoder = new ByteEncoderIterator(string)
    let result = textEncoder.next()

    while (result.done !== true) {
      if ((bvIndex + 1) > length) break
      byteView[++bvIndex] = result.value
      result = textEncoder.next()
    }

    return {
      read: textEncoder.read,
      written: bvIndex + 1
    }
  }
}

function isBuffer (byteView) {
  return (
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(byteView)
  )
}

console.log(new ByteEncoder().encodeToBuffer('Hello World!'))
