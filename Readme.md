
# ByteEncoder
[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

Encode data to utf8 bytes. Browser or NodeJS.

<br />

## Table of Contents
- [ Installation ](#install)
- [ Usage ](#usage)

<br />

<a name="install"></a>
## Install

```console
npm i byte-encoder 
```

<br />

<a name="usage"></a>
## Usage


### static (class) `ByteEncoder.Iterator`:

Args [`string: string`]

```js
import ByteView from 'byteview'
import ByteEncoder from 'byte-encoder'

const chunks = []

for (const chunk of new ByteEncoder.Iterator('Hello World!')) {
  chunks.push(chunk)
}

console.log(ByteView.from(chunks))
// prints: ByteView(12) [72, 101, 108, 108, 111, 32,  87, 111, 114, 108, 100, 33]
```


### static (method) `ByteEncoder.encode`:

Args [`string: string`]

```js
import ByteEncoder from 'byte-encoder'

console.log(ByteEncoder.encode('Hello World!'))
// prints: ByteView(12) [72, 101, 108, 108, 111, 32,  87, 111, 114, 108, 100, 33]
```


### (method) `ByteEncoder.encode`:

Args [`string: string`]

```js
import ByteEncoder from 'byte-encoder'

const byteEncoder = new ByteEncoder()

console.log(byteEncoder.encode('Hello World!'))
// prints: ByteView(12) [72, 101, 108, 108, 111, 32,  87, 111, 114, 108, 100, 33]
```


### (method) `ByteEncoder.encodeInto`:

Args [`string: string, byteView: ByteView | Buffer | ArrayBufferView`]

```js
import ByteEncoder from 'byte-encoder'

const byteEncoder = new ByteEncoder()
const byteView = ByteView.alloc(12)

console.log(byteView)
// prints: ByteView(12) [00, 00, 00, 00, 00, 00,  00, 00, 00, 00, 00, 00]

console.log(byteEncoder.encodeInto('Hello World!', byteView))
// prints: { read: 12, written: 12 }

console.log(byteView)
// prints: ByteView(12) [72, 101, 108, 108, 111, 32,  87, 111, 114, 108, 100, 33]
```
