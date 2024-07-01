import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { EbitsParser } from './lib/index.js'
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

    let script = args[0]

    // STEP 2: If the first argument does not end with .ebits, show a warning message
    if (!script.endsWith('.ebits')) {
        console.warn(chalk.yellowBright('WARNING: The script file should end with .ebits extension'))
        script += '.ebits'
    }

    // STEP 3: If the script file does not exist, show an error message
    try {
        const script_path = path.join(CURRENT_WORKING_DIR, script)
        await fs.access(script_path, fs.constants.R_OK)
    } catch (error) {
        showErrMsgAndExit('ERROR: The script file does not exist')
    }

    // STEP 4: Parse the script and validate the instructions
    new EbitsParser(script, (instructions) => {
        console.log(instructions)
    })

    // TODO: STEP 5: Read the audio file and start the device's audio player in the background
}

main().then((returnCode) => {
    process.exitCode = returnCode 
})