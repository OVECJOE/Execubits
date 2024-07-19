import fs from 'node:fs/promises'
import { join } from 'node:path'
import { showErrMsgAndExit } from '../utils.js'

class AudioReader {
    /** @type {string[]} */
    #files = []

    /**
     * @param {string[]} files The list of audio files to read
     */
    constructor(files) {
        this.#files = files
        this.load()
    }

    /**
     * Load the audio files
     * @returns {Promise<void>}
     */
    async load() {}
}

/**
 * @param {string} path The path to the audio file or folder containing audio files.
 * @param {boolean} recursive If true, load audio files recursively from the given path
 * @returns {Promise<void>}
 */
export default async function loadAudioFile(path, recursive = false) {
    // STEP 1: Confirm the path is valid
    try {
        await fs.access(path, fs.constants.R_OK)
    } catch (error) {
        showErrMsgAndExit('ERROR: The audio file does not exist')
    }

    /** @type {string[]} */
    let files = []

    // STEP 2: Get all audio files from that path
    const { isDirectory } = await fs.stat(path)
    if (isDirectory()) {
        const results = await fs.readdir(path, {
            withFileTypes: true,
            encoding: 'utf-8',
            recursive,
        })

        files = results.filter(f => f.isFile() && f.name.endsWith('.wav')).map(f => {
            return join(f.parentPath, f.name)
        })

        if (files.length === 0) {
            showErrMsgAndExit('ERROR: No audio files found in the directory')
        }
    } else {
        files.push(path)
    }

    // STEP 3: read and load the audio files
    const audioReader = new AudioReader(files)
}