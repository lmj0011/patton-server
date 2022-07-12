import { Server, Socket } from "socket.io";
import { Queue, QueueScheduler, Worker } from 'bullmq';
import chalk from 'chalk';

/**
 * This type definition augments existing definitions
 * from ../node_modules/socket.io/dist/socket.d.ts
 */
interface PattonSocket extends Socket {
    socketIoServer: Server
    upvoteQueue: Queue
    upvoteQueueScheduler: QueueScheduler
    upvoteQueueWorker: Worker
    logColorFilter: chalk.Chalk
    console: (message: any) => void,
}