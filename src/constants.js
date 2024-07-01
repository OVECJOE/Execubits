const INSTRUCTION_MAPPINGS = new Map()
const INSTRUCTION_DEPENDENCIES = new Map()

const CONFIGURED_INSTRUCTIONS = {
    '0000': {
        pseudonym: 'HALT',
        voidable: true,
        dependencies: ['1111', '1110', '0001'],
    },
    '0001': {
        pseudonym: 'DELAY',
        voidable: false,
        dependencies: [],
    },
    '0010': {
        pseudonym: 'FORWARD',
        voidable: false,
        dependencies: ['1111', '1110'],
    },
    '0011': {
        pseudonym: 'VOLUME_UP',
        voidable: true,
        dependencies: ['1111'],
    },
    '0100': {
        pseudonym: 'REPEAT',
        voidable: false,
        dependencies: ['0000'],
    },
    '0101': {
        pseudonym: 'SPEED_UP',
        voidable: false,
        dependencies: ['1111'],
    },
    '1010': {
        pseudonym: 'SPEED_DOWN',
        voidable: false,
        dependencies: ['1111'],
    },
    '1011': {
        pseudonym: 'JUMP',
        voidable: false,
        dependencies: ['0000', '1111', '1110'],
    },
    '1100': {
        pseudonym: 'VOLUME_DOWN',
        voidable: true,
        dependencies: ['1111'],
    },
    '1101': {
        pseudonym: 'BACKWARD',
        voidable: false,
        dependencies: ['1111', '1110'],
    },
    '1110': {
        pseudonym: 'PAUSE',
        voidable: true,
        dependencies: ['1111'],
    },
    '1111': {
        pseudonym: 'PLAY',
        voidable: true,
        dependencies: ['0000', '1110'],
    }
}

for (const [key, value] of Object.entries(CONFIGURED_INSTRUCTIONS)) {
    INSTRUCTION_MAPPINGS.set(key, {
        pseudonym: value.pseudonym,
        voidable: value.voidable,
    })

    INSTRUCTION_DEPENDENCIES.set(key, value.dependencies)
}

export { INSTRUCTION_MAPPINGS, INSTRUCTION_DEPENDENCIES }