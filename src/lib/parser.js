import fs from 'node:fs/promises'
import os from 'node:os'
import EventEmitter from 'node:events'
import { showErrMsgAndExit } from '../utils.js'
import { INSTRUCTION_MAPPINGS } from '../constants.js'
import { depsValidator, dataValidator } from './validators/index.js'

class EbitsParser {
    /**
     * @description: The handler will store the file descriptor of the script file.
     * @type {fs.FileHandle | null}
     * 
     * @private
     */
    #handler = null

    /**
     * @description: The scriptSize will store the size of the script file.
     * @type {number}
     * 
     * @private
     */
    #scriptSize = 0
    
    /**
     * @description: The instructions array will store the parsed instructions from the script file.
     * @type {{code: string, line: number, data: string[]}[]}
     * 
     * @private
     */
    #instructions = []

    /**
     * @param {string} scriptPath The path to the script file.
     * @param {function} callback The callback function to execute after parsing the script file.
     * 
     * @constructor
     */
    constructor(scriptPath, callback = async () => {}) {
        if (typeof scriptPath !== 'string') {
            showErrMsgAndExit('ERROR: The script path should be a string')
        }

        /** @type {EventEmitter} */
        this.parserEmitter = new EventEmitter()

        fs.open(scriptPath, 'r').then((descriptor) => {
            this.#handler = descriptor

            // get the file size
            this.#handler.stat().then((stats) => {
                // Check if the script path points to a file
                if (!stats.isFile()) {
                    showErrMsgAndExit('ERROR: The script path should point to a file')
                }

                // Check if the file is empty
                if (stats.size === 0) {
                    showErrMsgAndExit('ERROR: The script file is empty')
                }

                this.#scriptSize = stats.size
                this.#tokenise().then(() => {
                    this.parserEmitter.on('on-parse-complete', callback)
                    this.#parse()
                }) // start tokenising the script
            })
        })
    }

    get instructions() {
        return this.#instructions
    }

    get dependencies() {
        return this.#instructions.map(inst => INSTRUCTION_MAPPINGS.get(inst.code).dependencies)
    }

    async #tokenise() {
        const buffer = Buffer.alloc(1)
        let position = 0
        const tracker = {
            line: 1,
            code: '',
            data: [],
        }

        while (position < this.#scriptSize) {
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
                if (!tracker.code && position !== this.#scriptSize - 1) {
                    showErrMsgAndExit(`ERROR: Invalid instruction at line ${tracker.line}`)
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

        this.#handler.close()
    }

    async #parse() {
        let parsedInstCnt = 0
        for (const inst of this.instructions) {
            if (!INSTRUCTION_MAPPINGS.has(inst.code)) {
                showErrMsgAndExit(`ERROR: Invalid instruction at line ${inst.line}`)
            }

            if (inst.data.length === 0 && !INSTRUCTION_MAPPINGS.get(inst.code).voidable) {
                showErrMsgAndExit(`ERROR: No data provided for instruction at line ${inst.line}`)
            }

            if (inst.data.length > 0 && INSTRUCTION_MAPPINGS.get(inst.code).voidable) {
                showErrMsgAndExit(`ERROR: No data should be provided for the instruction at line ${inst.line}`)
            }

            // validate that the instruction was used correctly (i.e. dependencies are met)
            if (!depsValidator(this.instructions.slice(0, parsedInstCnt), inst)) {
                showErrMsgAndExit(`ERROR: Invalid instruction at line ${inst.line}`)
            }

            // validate the instruction data
            if (!dataValidator(inst.code, inst.data)) {
                showErrMsgAndExit(`ERROR: Invalid data for instruction at line ${inst.line}`)
            }

            parsedInstCnt++
        }

        // emit the parse complete event
        this.parserEmitter.emit('on-parse-complete', this.instructions)
    }
}

export default EbitsParser