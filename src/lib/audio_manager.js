import fs from 'node:fs/promises'
import { join } from 'node:path'
import { showErrMsgAndExit } from '../utils.js'
import { createReadStream } from 'node:fs'
import store from '../store.js'

class AudioManager {
    /** @type {string} */
    #path = null

    /**
     * @param {string} path The path to the audio file or folder containing audio files.
     */
    constructor(path) {
        this.#path = path
    }

    /**
     * @param {boolean} recursive If true, load audio files recursively from the given path
     * @returns {Promise<void>}
     */
    async #loadFiles(recursive = false) {
        // STEP 1: Confirm the path is valid
        try {
            await fs.access(this.#path, fs.constants.R_OK)
        } catch (error) {
            showErrMsgAndExit('The path to the audio file(s) does not exist')
        }

        /** @type {string[]} */
        let files = []

        // STEP 2: Get all audio files from that path
        const stats = await fs.stat(this.#path)
        if (stats.isDirectory()) {
            const results = await fs.readdir(this.#path, {
                withFileTypes: true,
                encoding: 'utf-8',
                recursive,
            })

            files = results.filter(f => f.isFile() && f.name.endsWith('.wav')).map(f => {
                return join(f.parentPath, f.name)
            })

            if (files.length === 0) {
                showErrMsgAndExit('No audio files found in the directory')
            }
        } else {
            files.push(this.#path)
        }

        // STEP 3: Store the audio files for later use
        store.update('audioFiles', files)
    }

    /**
     * Fetches the audio data from the given files and loads them into a stream.
     * @returns {Promise<void>}
     */
    async #streamFiles() {
        // STEP 1: Get the list of audio files
        const files = store.getItem('audioFiles')
        if (!files.length) {
            showErrMsgAndExit('No audio files found')
        }

        // STEP 2: Create a readable stream for each audio file
        const streams = await Promise.all(files.map(async file => {
            const stream = createReadStream(file, {
                encoding: 'binary',
                highWaterMark: 1024 * 1024,
            })
            stream.on('error', () => {
                showErrMsgAndExit(`Unable to read the audio file: ${file}`)
            })
            return stream
        }))

        // STEP 3: Merge all streams into a single stream and store it for later use
        store.update('audioStream', streams.reduce((acc, stream) => {
            return acc.pipe(stream)
        }))
    }

    /**
     * Initializes the audio manager.
     * @returns {Promise<void>}
     */
    async init() {
        await this.#loadFiles()
        await this.#streamFiles()
    }
}

export default AudioManager