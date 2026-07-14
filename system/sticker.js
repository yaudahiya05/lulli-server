const fs = require('fs')
const { tmpdir } = require('os')
const ff = require('fluent-ffmpeg')
const webp = require('node-webpmux')
const path = require('path')
const crypto = require('crypto');

async function imageToWebp (media) {

const tmpFileOut = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
const tmpFileIn = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.jpg`)

fs.writeFileSync(tmpFileIn, media)

await new Promise((resolve, reject) => {
ff(tmpFileIn)
.on('error', reject)
.on('end', () => resolve(true))
.addOutputOptions([`-vcodec`,`libwebp`,`-vf`,`scale=512:512:force_original_aspect_ratio=increase,fps=15,crop=512:512`]).toFormat('webp').save(tmpFileOut)
})

const buff = fs.readFileSync(tmpFileOut)
fs.unlinkSync(tmpFileOut)
fs.unlinkSync(tmpFileIn)
return buff
}

async function videoToWebp (media) {

const tmpFileOut = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
const tmpFileIn = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.mp4`)

fs.writeFileSync(tmpFileIn, media)

await new Promise((resolve, reject) => {
ff(tmpFileIn)
.on('error', reject)
.on('end', () => resolve(true))
.addOutputOptions([`-vcodec`,`libwebp`,`-vf`,`scale=512:512:force_original_aspect_ratio=increase,fps=15,crop=512:512`]).toFormat('webp').save(tmpFileOut)
})

const buff = fs.readFileSync(tmpFileOut)
fs.unlinkSync(tmpFileOut)
fs.unlinkSync(tmpFileIn)
return buff
}

async function writeExifImg (media, metadata) {
let wMedia = await imageToWebp(media)
const tmpFileIn = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
const tmpFileOut = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
fs.writeFileSync(tmpFileIn, wMedia)

if (metadata.packname || metadata.author) {
const img = new webp.Image()
let json = {
'sticker-pack-id': 'https://instagram.com/surya_skylark05',
'sticker-pack-name': metadata.packname,
'sticker-pack-publisher': metadata.author,
'emojis': metadata.categories ? metadata.categories : [''],
'is-avatar-sticker': metadata.avatar ? 1 : 0,
'is-ai-sticker': metadata.ai ? 1 : 0
}
const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
const exif = Buffer.concat([exifAttr, jsonBuff])
exif.writeUIntLE(jsonBuff.length, 14, 4)
await img.load(tmpFileIn)
fs.unlinkSync(tmpFileIn)
img.exif = exif
await img.save(tmpFileOut)
return tmpFileOut
}
}

async function writeExifVid (media, metadata) {
let wMedia = await videoToWebp(media)
const tmpFileIn = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
const tmpFileOut = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
fs.writeFileSync(tmpFileIn, wMedia)

if (metadata.packname || metadata.author) {
const img = new webp.Image()
let json = {
'sticker-pack-id': 'https://instagram.com/surya_skylark05',
'sticker-pack-name': metadata.packname,
'sticker-pack-publisher': metadata.author,
'emojis': metadata.categories ? metadata.categories : [''],
'is-avatar-sticker': metadata.avatar ? 1 : 0,
'is-ai-sticker': metadata.ai ? 1 : 0
}
const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
const exif = Buffer.concat([exifAttr, jsonBuff])
exif.writeUIntLE(jsonBuff.length, 14, 4)
await img.load(tmpFileIn)
fs.unlinkSync(tmpFileIn)
img.exif = exif
await img.save(tmpFileOut)
return tmpFileOut
}
}

async function writeExif (media, metadata) {
let wMedia = /webp/.test(media.mimetype) ? media.data : /image/.test(media.mimetype) ? await imageToWebp(media.data) : /video/.test(media.mimetype) ? await videoToWebp(media.data) : ''
const tmpFileIn = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
const tmpFileOut = path.join('./sampah', `${crypto.randomBytes(10).toString('hex')}.webp`)
fs.writeFileSync(tmpFileIn, wMedia)

if (metadata.packname || metadata.author) {
const img = new webp.Image()
let json = {
'sticker-pack-id': 'https://instagram.com/surya_skylark05',
'sticker-pack-name': metadata.packname,
'sticker-pack-publisher': metadata.author,
'emojis': metadata.categories ? metadata.categories : [''],
'is-avatar-sticker': metadata.avatar ? 1 : 0,
'is-ai-sticker': metadata.ai ? 1 : 0
}
const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
const exif = Buffer.concat([exifAttr, jsonBuff])
exif.writeUIntLE(jsonBuff.length, 14, 4)
await img.load(tmpFileIn)
fs.unlinkSync(tmpFileIn)
img.exif = exif
await img.save(tmpFileOut)
return tmpFileOut
}
}

module.exports = { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif }