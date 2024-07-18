import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { loadAudioFile, EbitsParser, BgAudioPlayer } from './lib/index.js'
import { showErrMsgAndExit } from './utils.js'

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

const main = async (
    args = process.argv.slice(2)
) => {
    // STEP 1: If no arguments are provided, show the usage message
    if (args.length === 0) {
        console.info(chalk.cyan(await generateUsage()))
        return args.length.toString(2)
    }

    let scriptPath = args[0]

    // STEP 2: If the first argument does not end with .ebits, show a warning message
    if (!scriptPath.endsWith('.ebits')) {
        console.warn(chalk.yellowBright('WARNING: The script file should end with .ebits extension'))
        scriptPath += '.ebits'
    }

    // STEP 3: If the script file does not exist, show an error message
    try {
        scriptPath = path.join(CURRENT_WORKING_DIR, scriptPath)
        await fs.access(scriptPath, fs.constants.R_OK)
    } catch (error) {
        showErrMsgAndExit('ERROR: The script file does not exist')
    }

    // STEP 4: Parse the script and validate the instructions
    const parser = new EbitsParser(scriptPath, {
        ON_TOKENISATION_END: () => loadAudioFile(2),
        ON_PARSING_END: BgAudioPlayer.init,
    })

    // Start the parsing process
    await parser.init(scriptPath)

    // TODO: STEP 5: Read the audio file and start the device's audio player in the background
}

main().then((returnCode) => {
    process.exitCode = returnCode 
})
