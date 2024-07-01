import chalk from "chalk"

export function showErrMsgAndExit(msg) {
  console.error(chalk.red(msg))
  process.exit(1)
}