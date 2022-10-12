
import ByteView from 'byteview'

class ByteEncoderIterator {
  #string
  #read = 0
  #written = 0

  constructor (string = '') {
    if (typeof string !== 'string') {
      throw new TypeError('Expected typeof "string". Recieved typeof: "' + typeof string + '"')
    }
    this.#string = string
  }

  get [Symbol.toStringTag] () {
    return 'ByteEncoder'
  }

  get read () {
    return this.#read
  }

  get written () {
    return this.#written
  }

  * [Symbol.iterator] () {
    let index = -1
    let leadSurrogate = null
    const { length } = this.#string
    this.#read = 0
    this.#written = 0

    while (++index < length) {
      let codePoint = this.#string.charCodeAt(index)
      ++this.#read
      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // if last char was not a lead
        if (leadSurrogate === null) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            this.#written += 3
            yield * [0xEF, 0xBF, 0xBD]
            continue
          } else if (index + 1 === length) {
            // unpaired lead
            this.#written += 3
            yield * [0xEF, 0xBF, 0xBD]
            continue
          }

          // valid lead
          leadSurrogate = codePoint

          continue
        }

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          this.#written += 3
          yield * [0xEF, 0xBF, 0xBD]
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        this.#written += 3
        yield * [0xEF, 0xBF, 0xBD]
        continue
      }
      leadSurrogate = null

      // encode utf8
      if (codePoint < 0x80) {
        ++this.#written
        yield codePoint
      } else if (codePoint < 0x800) {
        this.#written += 2
        yield * [
          codePoint >> 0x6 | 0xC0,
          codePoint & 0x3F | 0x80
        ]
      } else if (codePoint < 0x10000) {
        this.#written += 3
        yield * [
          codePoint >> 0xC | 0xE0,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        ]
      } else if (codePoint < 0x110000) {
        this.#written += 4
        yield * [
          codePoint >> 0x12 | 0xF0,
          codePoint >> 0xC & 0x3F | 0x80,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        ]
      } else {
        throw new Error('Invalid code point')
      }
    }
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

  /**
   *
   * @param {string} string
   * @returns {ByteView}
   */
  encode (string = '') {
    if (typeof string !== 'string') {
      throw new TypeError('Expected type "string". Recieved type: "' + typeof string + '"')
    }
    let index = -1
    let leadSurrogate = null
    const { length } = string
    const optimisticLength = length * 2 + 5
    let byteView = new ByteView(optimisticLength)
    let read = 0
    let written = 0
    let offset = -1

    while (++index < length) {
      let codePoint = string.charCodeAt(index)
      ++read
      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // if last char was not a lead
        if (leadSurrogate === null) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if (written + 3 >= byteView.length) {
              // reallocate ByteView
              byteView = ByteView.concat(
                [byteView],
                written + (length - (read - 1)) * 3
              )
            }
            byteView[++offset] = 0xEF
            byteView[++offset] = 0xBF
            byteView[++offset] = 0xBD
            written += 3
            continue
          } else if (index + 1 === length) {
            // unpaired lead
            if (written + 3 >= byteView.length) {
              // reallocate ByteView
              byteView = ByteView.concat(
                [byteView],
                written + (length - (read - 1)) * 3
              )
            }
            byteView[++offset] = 0xEF
            byteView[++offset] = 0xBF
            byteView[++offset] = 0xBD
            written += 3
            continue
          }

          // valid lead
          leadSurrogate = codePoint

          continue
        }

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if (written + 3 >= byteView.length) {
            // reallocate ByteView
            byteView = ByteView.concat(
              [byteView],
              written + (length - (read - 1)) * 3
            )
          }
          byteView[++offset] = 0xEF
          byteView[++offset] = 0xBF
          byteView[++offset] = 0xBD
          written += 3
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if (written + 3 >= byteView.length) {
          // reallocate ByteView
          byteView = ByteView.concat(
            [byteView],
            written + (length - (read - 1)) * 3
          )
        }
        byteView[++offset] = 0xEF
        byteView[++offset] = 0xBF
        byteView[++offset] = 0xBD
        written += 3
        continue
      }
      leadSurrogate = null

      // encode utf8
      if (codePoint < 0x80) {
        if (written + 1 >= byteView.length) {
          // reallocate ByteView
          byteView = ByteView.concat(
            [byteView],
            written + (length - (read - 1)) * 3
          )
        }
        byteView[++offset] = codePoint
        written += 1
      } else if (codePoint < 0x800) {
        if (written + 2 >= byteView.length) {
          // reallocate ByteView
          byteView = ByteView.concat(
            [byteView],
            written + (length - (read - 1)) * 3
          )
        }
        byteView[++offset] = codePoint >> 0x6 | 0xC0
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 2
      } else if (codePoint < 0x10000) {
        if (written + 3 >= byteView.length) {
          // reallocate ByteView
          byteView = ByteView.concat(
            [byteView],
            written + (length - (read - 1)) * 3
          )
        }
        byteView[++offset] = codePoint >> 0xC | 0xE0
        byteView[++offset] = codePoint >> 0x6 & 0x3F | 0x80
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 3
      } else if (codePoint < 0x110000) {
        if (written + 4 >= byteView.length) {
          // reallocate ByteView
          byteView = ByteView.concat(
            [byteView],
            written + (length - (read - 1)) * 3
          )
        }
        byteView[++offset] = codePoint >> 0x12 | 0xF0
        byteView[++offset] = codePoint >> 0xC & 0x3F | 0x80
        byteView[++offset] = codePoint >> 0x6 & 0x3F | 0x80
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 4
      } else {
        throw new Error('Invalid code point')
      }
    }
    return byteView.slice(0, written)
  }

  /**
   *
   * @param {string} string
   * @param {ByteView | ArrayBufferView} byteView
   * @returns {{ written: number, read: number }}
   */
  encodeInto (string, byteView) {
    if (typeof string !== 'string') {
      throw new TypeError('Expected type "string". Recieved type: "' + typeof string + '"')
    }
    if (!ByteView.isByteView(byteView) && !ByteView.isView(byteView) && !isBuffer(byteView)) {
      throw new TypeError('Expected instance of "ByteView | TypedArray | Buffer"')
    }
    let index = -1
    let leadSurrogate = null
    const { length } = string
    const max = byteView.length
    let read = 0
    let written = 0
    let offset = -1

    while (++index < length) {
      let codePoint = string.charCodeAt(index)
      if (written + 1 >= max) {
        return { written, read }
      }
      ++read
      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // if last char was not a lead
        if (leadSurrogate === null) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if (written + 3 >= max) {
              --read
              return { written, read }
            }
            byteView[++offset] = 0xEF
            byteView[++offset] = 0xBF
            byteView[++offset] = 0xBD
            written += 3
            continue
          } else if (index + 1 === length) {
            // unpaired lead
            if (written + 3 >= max) {
              --read
              return { written, read }
            }
            byteView[++offset] = 0xEF
            byteView[++offset] = 0xBF
            byteView[++offset] = 0xBD
            written += 3
            continue
          }

          // valid lead
          leadSurrogate = codePoint

          continue
        }

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if (written + 3 >= max) {
            --read
            return { written, read }
          }
          byteView[++offset] = 0xEF
          byteView[++offset] = 0xBF
          byteView[++offset] = 0xBD
          written += 3
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if (written + 3 >= max) {
          --read
          return { written, read }
        }
        byteView[++offset] = 0xEF
        byteView[++offset] = 0xBF
        byteView[++offset] = 0xBD
        written += 3
        continue
      }
      leadSurrogate = null

      // encode utf8
      if (codePoint < 0x80) {
        if (written + 1 >= max) {
          --read
          return { written, read }
        }
        byteView[++offset] = codePoint
        written += 1
      } else if (codePoint < 0x800) {
        if (written + 2 >= max) {
          --read
          return { written, read }
        }
        byteView[++offset] = codePoint >> 0x6 | 0xC0
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 2
      } else if (codePoint < 0x10000) {
        if (written + 3 >= max) {
          --read
          return { written, read }
        }
        byteView[++offset] = codePoint >> 0xC | 0xE0
        byteView[++offset] = codePoint >> 0x6 & 0x3F | 0x80
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 3
      } else if (codePoint < 0x110000) {
        if (written + 4 >= max) {
          --read
          return { written, read }
        }
        byteView[++offset] = codePoint >> 0x12 | 0xF0
        byteView[++offset] = codePoint >> 0xC & 0x3F | 0x80
        byteView[++offset] = codePoint >> 0x6 & 0x3F | 0x80
        byteView[++offset] = codePoint & 0x3F | 0x80
        written += 4
      } else {
        throw new Error('Invalid code point')
      }
    }
    return { written, read }
  }
}

function isBuffer (byteView) {
  return (
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(byteView)
  )
}
