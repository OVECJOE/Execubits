import fs from 'node:fs/promises'
import { join } from 'node:path'
import { showErrMsgAndExit } from '../utils.js'
import store from '../store.js'
import { decodeWav } from './wav.js'

const MAX_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

class AudioManager {
    #path = null

    constructor(path) {
        this.#path = path
    }

    async #loadFiles() {
        try {
            await fs.access(this.#path, fs.constants.R_OK)
        } catch (error) {
            showErrMsgAndExit('The path to the audio file(s) does not exist')
        }
        let files = []
        const stats = await fs.stat(this.#path)
        if (stats.isDirectory()) {
            const results = await fs.readdir(this.#path, {
                withFileTypes: true,
                encoding: 'utf-8',
            })
            files = results.filter(f => f.isFile() && f.name.endsWith('.wav')).map(f => join(this.#path, f.name))
            if (files.length === 0) {
                showErrMsgAndExit('No audio files found in the directory')
            }
        } else {
            files.push(this.#path)
        }
        store.update('audioFiles', files)
    }

    async *pcmChunks() {
        const files = store.getItem('audioFiles')
        if (!files.length) {
            showErrMsgAndExit('No audio files found')
        }
        let wavInfos = []
        for (const file of files) {
            const wavInfo = await decodeWav(file)
            wavInfos.push(wavInfo)
        }
        // Check format compatibility
        const { numChannels, sampleRate, bitsPerSample } = wavInfos[0]
        for (const info of wavInfos) {
            if (
                info.numChannels !== numChannels ||
                info.sampleRate !== sampleRate ||
                info.bitsPerSample !== bitsPerSample
            ) {
                showErrMsgAndExit('All WAV files must have the same format (channels, sample rate, bits per sample) to be combined')
            }
        }
        // Yield PCM chunks up to MAX_CHUNK_SIZE
        for (const info of wavInfos) {
            let offset = 0
            while (offset < info.pcm.length) {
                const end = Math.min(offset + MAX_CHUNK_SIZE, info.pcm.length)
                yield {
                    pcm: info.pcm.subarray(offset, end),
                    wavInfo: { numChannels, sampleRate, bitsPerSample },
                }
                offset = end
            }
        }
    }

    async init() {
        await this.#loadFiles()
    }
}

export default AudioManager
