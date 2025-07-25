import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'

function readUIntLE(buffer, offset, byteLength) {
    let val = 0
    for (let i = 0; i < byteLength; i++) {
        val += buffer[offset + i] << (8 * i)
    }
    return val
}

export function readIntLE(buffer, offset, byteLength) {
    let val = readUIntLE(buffer, offset, byteLength)
    const max = 1 << (8 * byteLength - 1)
    if (val >= max) val -= 2 * max
    return val
}

export async function decodeWav(filePath) {
    const buffer = await fs.readFile(filePath)
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('Not a valid WAV file')
    }
    let offset = 12
    let fmtChunk, dataChunk
    while (offset < buffer.length) {
        const chunkId = buffer.toString('ascii', offset, offset + 4)
        const chunkSize = readUIntLE(buffer, offset + 4, 4)
        if (chunkId === 'fmt ') {
            fmtChunk = {
                audioFormat: readUIntLE(buffer, offset + 8, 2),
                numChannels: readUIntLE(buffer, offset + 10, 2),
                sampleRate: readUIntLE(buffer, offset + 12, 4),
                byteRate: readUIntLE(buffer, offset + 16, 4),
                blockAlign: readUIntLE(buffer, offset + 20, 2),
                bitsPerSample: readUIntLE(buffer, offset + 22, 2),
            }
        } else if (chunkId === 'data') {
            dataChunk = {
                offset: offset + 8,
                length: chunkSize,
            }
        }
        offset += 8 + chunkSize
    }
    if (!fmtChunk || !dataChunk) throw new Error('Malformed WAV file')
    const pcm = buffer.slice(dataChunk.offset, dataChunk.offset + dataChunk.length)
    return {
        ...fmtChunk,
        pcm,
        wavHeader: buffer.slice(0, dataChunk.offset),
    }
}

export function encodeWav({ pcm, numChannels, sampleRate, bitsPerSample }) {
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8
    const dataSize = pcm.length
    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)
    return Buffer.concat([header, pcm])
}

export function setVolume(pcm, bitsPerSample, volume) {
    const out = Buffer.alloc(pcm.length)
    if (bitsPerSample === 16) {
        for (let i = 0; i < pcm.length; i += 2) {
            let sample = pcm.readInt16LE(i)
            sample = Math.max(-32768, Math.min(32767, Math.round(sample * volume)))
            out.writeInt16LE(sample, i)
        }
    } else if (bitsPerSample === 8) {
        for (let i = 0; i < pcm.length; i++) {
            let sample = pcm.readInt8(i)
            sample = Math.max(-128, Math.min(127, Math.round(sample * volume)))
            out.writeInt8(sample, i)
        }
    } else {
        throw new Error('Unsupported bits per sample')
    }
    return out
}

export function changeSpeed(pcm, bitsPerSample, speed) {
    if (speed === 1) return Buffer.from(pcm)
    const sampleSize = bitsPerSample / 8
    const numSamples = Math.floor(pcm.length / sampleSize)
    const newNumSamples = Math.floor(numSamples / speed)
    const out = Buffer.alloc(newNumSamples * sampleSize)
    for (let i = 0; i < newNumSamples; i++) {
        const srcIdx = Math.floor(i * speed) * sampleSize
        for (let b = 0; b < sampleSize; b++) {
            out[i * sampleSize + b] = pcm[srcIdx + b]
        }
    }
    return out
}

export function seek(pcm, bitsPerSample, numChannels, sampleRate, seconds) {
    const sampleSize = bitsPerSample / 8
    const samplesPerSec = sampleRate * numChannels
    const offset = Math.floor(samplesPerSec * seconds) * sampleSize
    if (offset >= pcm.length) return Buffer.alloc(0)
    return pcm.slice(offset)
}

export function repeat(pcm, times) {
    if (times <= 1) return Buffer.from(pcm)
    const out = Buffer.alloc(pcm.length * times)
    for (let i = 0; i < times; i++) {
        pcm.copy(out, i * pcm.length)
    }
    return out
} 