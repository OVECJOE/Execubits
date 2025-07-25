import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { AudioManager, EbitsParser } from './lib/index.js'
import { showErrMsgAndExit, showWarningMsg } from './utils.js'
import store from './store.js'
import { executeInstructions } from './lib/executor.js'

const CURRENT_WORKING_DIR = process.cwd()

const generateUsage = async () => {
    const usage = [
        'USAGE: execubits [SCRIPT] [OPTIONS]',
        '\tSCRIPT: A .ebits script file to execute',
        '\tOPTIONS:',
    ]

    const USAGE_DATA = await import('./usage.json', { assert: { type: 'json' } }).then(module => module.default)
    for (const option of USAGE_DATA) {
        const option_usage = [
            `\t\t${option.name}: ${option.description}`,
        ]

        for (const example of option.examples) {
            option_usage.push(`\t\t\t${example.join(' ')}`)
        }

        // add side note if available
        if (option.side_note) {
            option_usage.push(`\t\t\tNOTE: ${option.side_note}`)
        }

        usage.push(...option_usage, '\n')
    }

    return usage.join('\n')
}

const parseArgs = (args) => {
    const options = {
        audioFile: null,
        watchMode: 'none',
    }
    let script = null
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg === '-a' || arg === '--audio-file') {
            options.audioFile = args[++i]
        } else if (arg === '-w' || arg === '--watch-mode') {
            options.watchMode = args[++i]
        } else if (!script && arg.endsWith('.ebits')) {
            script = arg
        } else if (!script && !arg.startsWith('-')) {
            script = arg
        }
    }
    if (options.audioFile && !options.audioFile.endsWith('.wav')) {
        options.audioFile += '.wav'
    }
    return { script, options }
}

const main = async (args = process.argv.slice(2)) => {
    const { script, options } = parseArgs(args)
    if (!script) {
        console.info(chalk.cyan(await generateUsage()))
        return '0'
    }
    let scriptPath = script
    if (!scriptPath.endsWith('.ebits')) {
        showWarningMsg('The script file should end with .ebits extension')
        scriptPath += '.ebits'
    }
    try {
        scriptPath = path.join(CURRENT_WORKING_DIR, scriptPath)
        await fs.access(scriptPath, fs.constants.R_OK)
    } catch (error) {
        showErrMsgAndExit('The script file does not exist')
    }
    const audioPath = options.audioFile || args[1]
    if (!audioPath) {
        showErrMsgAndExit('No audio file provided. Use -a <audio.wav> or provide as second argument.')
    }
    const audioManager = new AudioManager(audioPath)
    const parser = new EbitsParser(scriptPath, {
        ON_TOKENISATION_END: () => audioManager.init(),
        ON_PARSING_END: async (instructions) => {
            store.update('instructions', instructions)
            console.log(instructions)
            if (!instructions.length) {
                showErrMsgAndExit('No instructions found in the script.')
            }
            await executeInstructions(instructions)
        }
    })
    await parser.init(scriptPath)
}

main().then((returnCode) => {
    process.exitCode = returnCode 
})
