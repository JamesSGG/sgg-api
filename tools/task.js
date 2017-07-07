/*
 * Minimalistic script runner. Usage example:
 *
 *     node tools/db.js migrate
 *     Starting 'db-migrate'...
 *     Finished 'db-migrate' in 25ms
 */

function run(task, action, ...args) {
  const command = process.argv[2]
  const start = new Date()
  const taskName = (
    command && !command.startsWith('-')
    ? `${task}-${command}`
    : task
  )

  process.stdout.write(`Starting '${taskName}'...\n`)

  const getDuration = () => new Date().getTime() - start.getTime()

  return Promise.resolve()
    .then(() => action(...args))
    .then(() => {
      process.stdout.write(`Finished '${taskName}' after ${getDuration()}ms\n`)
    })
    .catch((err) => {
      process.stderr.write(`${err.stack}\n`)
    })
}

process.nextTick(() => require.main.exports())

module.exports = (task, action) => run.bind(undefined, task, action)
