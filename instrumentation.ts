export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { log } = await import('next-axiom')
    log.info('Server started')
  }
}