export default class BgAudioPlayer {
    /** @type {string[]} */
    #instructions = []

    constructor(instructions) {
        this.#instructions = instructions
    }

    /**
     * Plays the given audio stream as a background process.
     * @param {ReadableStream} stream The audio stream to play
     * @returns {Promise<void>}
     * 
     * @example
     * const player = new BgAudioPlayer()
     * player.play(stream)
     */
    async play(stream) {
    }
}