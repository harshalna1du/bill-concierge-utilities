import pino from 'pino';
import path from 'path';

/**
 * Creates a pino logger instance that writes to both a file and the console.
 * @returns {import('pino').Logger}
 */
export function createLogger() {
  const transport = pino.transport({
    targets: [
      {
        target: 'pino/file',
        level: 'info',
        // Log to an absolute path to avoid ambiguity.
        options: { destination: path.resolve('app.log'), mkdir: true, append: true }
      },
      {
        target: 'pino-pretty',
        // Set to 'warn' to reduce verbosity in the console during chat sessions.
        level: 'warn',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'SYS:HH:MM:ss.l'
        }
      }
    ]
  });

  // The transport runs in a separate worker thread. This event handler
  // catches errors from the transport worker, which would otherwise be silent.
  transport.on('error', (err) => {
    console.error('Error from pino transport:', err);
  });

  return pino(transport);
}