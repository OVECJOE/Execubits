import fs from 'node:fs/promises'
import os from 'node:os'
import EventEmitter from 'node:events'
import { showErrMsgAndExit, showInfoMsg } from '../utils.js'
import { INSTRUCTION_MAPPINGS } from '../constants.js'
import { depsValidator, dataValidator } from './validators/index.js'

class EbitsParser extends EventEmitter {
    /**
     * @description: The handler will store the file descriptor of the script file.
     * @type {fs.FileHandle | null}
     * 
     * @private
     */
    #handler = null

    /**
     * @description: The script path will store the path to the script file.
     * @type {string}
     * 
     * @private
     */
    #scriptFile = ''
    
    /**
     * @description: The instructions array will store the parsed instructions from the script file.
     * @type {{code: string, line: number, data: string[]}[]}
     * 
     * @private
     */
    #instructions = []

    /**
     * @description: Supported events for the parser.
     * @type {Record<string, (arg?: string) => Promise<void> | null>}
     * 
     * @private
     */
    #events = {
        ON_TOKENISATION_START: this.#tokenise.bind(this),
        ON_PARSING_START: this.#parse.bind(this),
        ON_TOKENISATION_END: null,
        ON_PARSING_END: null,
    }

    /**
     * @param {string} path The path to the script file.
     * @param {Record<'ON_TOKENISATION_END' | 'ON_PARSING_END', (arg?: string) => Promise<void>>} listeners The event listeners for the parser.
     * @constructor
     */
    constructor(path, listeners) {
        super({ captureRejections: true })

        if (typeof path !== 'string') {
            showErrMsgAndExit('The script path should be a string')
        }

        // Register the events
        for (const [event, listener] of Object.entries(this.#events)) {
            if ([ 'ON_TOKENISATION_END', 'ON_PARSING_END' ].includes(event)) {
                if (typeof listeners !== 'object' || typeof listeners[event] !== 'function') {
                    showErrMsgAndExit(`The listener for event ${event} should be a function`)
                }

                if (typeof listeners === 'object' && typeof listeners[event] === 'function') {
                    this.once(event, listeners[event])
                }

                continue
            }

            this.once(event, listener)
        }

        this.#scriptFile = path
    }

    get dependencies() {
        return this.#instructions.map(inst => INSTRUCTION_MAPPINGS.get(inst.code).dependencies)
    }

    /**
     * @param {string} path The path to the script file.
     * @returns {Promise<void>}
     */
    async init(path) {
        try {
            // Open the script file in read mode
            this.#handler = await fs.open(path, 'r')

            // get the file size
            const stats = await this.#handler.stat()
            if (!stats.isFile()) {
                showErrMsgAndExit('The script path should point to a file')
            }

            if (stats.size === 0) {
                showErrMsgAndExit('The script file is empty')
            }

            // Start the tokenisation process
            this.emit('ON_TOKENISATION_START', stats.size)
        } catch (error) {
            showErrMsgAndExit('The script file does not exist')
        }

    }

    async #tokenise(scriptSize = 0) {
        const buffer = Buffer.alloc(1)
        let position = 0
        const tracker = {
            line: 1,
            code: '',
            data: [],
        }

        while (position < scriptSize) {
            await this.#handler.read(buffer, 0, buffer.byteLength, position)
            const char = buffer.toString('utf8', 0, 1);

            if (os.EOL.includes(char)) {
                this.#instructions.push({ ...tracker })
                // Reset the tracker
                tracker.line++
                tracker.code = ''
                tracker.data = []

                // Handle \r\n case on Windows
                position += os.EOL.length - char.length
            } else if (/\s+?/.test(char)) {
                if (!tracker.code && position !== scriptSize - 1) {
                    showErrMsgAndExit(`Invalid instruction at line ${tracker.line}`)
                }
    
                tracker.data.push('')
            } else {
                if (tracker.code.length < 4) {
                    tracker.code += char
                } else {
                    if (tracker.data.length === 0) {
                        tracker.data.push('')
                    }

                    tracker.data[tracker.data.length - 1] += char
                }
            }

            position++
        }

        // Check if the last instruction is complete
        if (tracker.code) {
            this.#instructions.push({ ...tracker })
        }

        // Begin the parsing process
        this.emit('ON_PARSING_START')
    }

    async #parse() {
        // Notify about the end of tokenisation process
        this.emit('ON_TOKENISATION_END')

        let parsedInstCnt = 0
        for (const inst of this.#instructions) {
            if (!INSTRUCTION_MAPPINGS.has(inst.code)) {
                showErrMsgAndExit(`Invalid instruction at line ${inst.line}`)
            }

            if (inst.data.length === 0 && !INSTRUCTION_MAPPINGS.get(inst.code).voidable) {
                showErrMsgAndExit(`No data provided for instruction at line ${inst.line}`)
            }

            if (inst.data.length > 0 && INSTRUCTION_MAPPINGS.get(inst.code).voidable) {
                showErrMsgAndExit(`No data should be provided for the instruction at line ${inst.line}`)
            }

            // validate that the instruction was used correctly (i.e. dependencies are met)
            if (!depsValidator(this.#instructions.slice(0, parsedInstCnt), inst)) {
                showErrMsgAndExit(`Invalid instruction at line ${inst.line}`)
            }

            // validate the instruction data
            if (!dataValidator(inst.code, inst.data)) {
                showErrMsgAndExit(`Invalid data for instruction at line ${inst.line}`)
            }

            parsedInstCnt++
        }

        showInfoMsg(`Successfully parsed ${parsedInstCnt} instructions`)
        this.emit('ON_PARSING_END', this.#instructions) // Notify about the end of parsing process
    }
}

export default EbitsParser