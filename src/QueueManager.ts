import { Job, Queue, Worker, QueueScheduler, Processor } from 'bullmq';
import { Server } from "socket.io";
import { PattonSocket } from './types/socket.io';
import Redis from 'ioredis';
import { RedditThing } from './RedditThing';
const { rando, randoSequence } = require('@nastyox/rando.js');

const redisConnection = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null
});


export class QueueManager {
    readonly thingsToUpvoteQueue = new Queue('ThingsToUpvoteQueue', { connection: redisConnection });
    readonly thingsToUpvoteQueueScheduler = new QueueScheduler(this.thingsToUpvoteQueue.name, { connection: redisConnection });
    readonly maxUpvotePathCount = 100;

    private queueList: Queue[]

    constructor() {
        const thingsToUpvoteQueueWorker = new Worker(this.thingsToUpvoteQueue.name, async (job: Job) => {
            // Do Nothing
            return true;
        }, { connection: redisConnection });
          
        thingsToUpvoteQueueWorker.on('completed', job => {
            // Called every time a job is completed.
            console.log(`thingsToUpvoteQueue Job completed: ${job.id}`)
        })
          
        thingsToUpvoteQueueWorker.on('failed', (job, error) => {
            console.log(`thingsToUpvoteQueue Job failed: ${job.id}; ${error}`)
        })

          
        thingsToUpvoteQueueWorker.on('error', err => { console.error(err) });
    }


    async addJobToThingsToUpvoteQueue(io: Server, thing: RedditThing): Promise<Job<any, any, string>> {

      const job = await this.thingsToUpvoteQueue.add(`Job:${thing.fullName}`, { thing: 
        { id: thing.id, kind: thing.kind, name: thing.fullName, subredditNamePrefixed: thing.subredditNamePrefixed } 
      },
      { jobId: thing.fullName, removeOnComplete: true, removeOnFail: true, delay: 8.64e7 } // 24hr is 8.64e7
      );

      // add job to the upvoteQueue of all Socket instances
      for(const socket of io.sockets.sockets.values() as IterableIterator<PattonSocket>) {
        const delay = 90000 * await socket.upvoteQueue.count().then(cnt => { return cnt + 1 }) // avoids multipling by 0
        await socket.upvoteQueue.add(`${job.name}`,job.data, {...job.opts, delay: delay})
        socket.emit("log", `${job.data.thing.name} added to upvote queue`)
        socket.emit("log", `Your upvote queue count: ${await socket.upvoteQueue.count()}`)
      }
      
      return job
    }

    async createSocketQueue(socket: PattonSocket): Promise<boolean> {

      socket.upvoteQueue = new Queue(`${socket.id}:UpvoteQueue`, { connection: redisConnection })
      socket.upvoteQueueScheduler = new QueueScheduler(socket.upvoteQueue.name, { connection: redisConnection });
      socket.upvoteQueueWorker = new Worker(socket.upvoteQueue.name, async (job: Job) => {
        
        // send payload to client
        socket.socketIoServer.timeout(5000).to(socket.id).emit("upvoteThisThing", job.data.thing, async (err: any, response: any) => {
            if (err) console.log(err)

            socket.console(`socket ${socket.id} replied: ${response}`);
            socket.emit("log", `Your upvote queue count: ${await socket.upvoteQueue.count()}`);
          })

        return true;
      }, { connection: redisConnection });

      const thingsToUpvoteQueueCount = await this.thingsToUpvoteQueue.count()
      let seqArray: number[]
      let seqArrayReduced: number[]

      if(thingsToUpvoteQueueCount > 0) {
        seqArray = randoSequence(0, (thingsToUpvoteQueueCount - 1))

        if(seqArray.length > this.maxUpvotePathCount) {
            seqArrayReduced = seqArray.slice(0, 100)
      
            
            for(let ele of seqArrayReduced) {
              const jobs = await this.thingsToUpvoteQueue.getJobs(null, ele, ele)
              const job = jobs.pop()
      
              if(job instanceof Job) {
                // create user's queue of things to upvote
                 // formula for delay option:
                  // (90k ms) * Queue.count

                const delay = 90000 * await socket.upvoteQueue.count().then(cnt => { return cnt + 1 }) // avoids multipling by 0
                await socket.upvoteQueue.add(`${job.name}`,job.data, {...job.opts, delay: delay})
              }
            }
          } else {
              for(let ele of seqArray) {
                const jobs = await this.thingsToUpvoteQueue.getJobs(null, ele, ele)
                const job = jobs.pop()
      
                if(job instanceof Job) {
                  // create user's queue of things to upvote
                   // formula for delay option:
                    // (90k ms) * Queue.count
                  
                  const delay = 90000 * await socket.upvoteQueue.count().then(cnt => { return cnt + 1 })
                  await socket.upvoteQueue.add(`${job.name}`,job.data, {...job.opts, delay: delay})
                }
              }
          }

      } else {

      }

      socket.emit("log", `Your upvote queue count: ${await socket.upvoteQueue.count()}`)

      socket.upvoteQueueWorker.on('completed', job => {
        // TODO check userQueue.count and refill if empty
        socket.console(`socket.upvoteQueueWorker Job completed: ${job.id}`)
      })
    
      socket.upvoteQueueWorker.on('failed', (job, error) => {
        socket.console(`socket.upvoteQueueWorker Job failed: ${job.id}; ${error}`)
      })

      socket.upvoteQueueWorker.on('error', err => { socket.console(err) });
        
      return Promise.resolve(true)
    }

    // async destroySocketQueue(socket: PattonSocket): Promise<boolean> {
        
    //     return Promise.resolve(true)
    // }

    // private setSocketQueueWorker(socket: PattonSocket, processor: Processor): void {

    //     socket.upvoteQueueWorker = new Worker(socket.id, processor)
    // }

    // Mock functions

    async addMockJobs(count: number = 100): Promise<boolean> {
        const seqArray: number[] = randoSequence(1, 100)

        for(let i = 0; i < 100; i++) {
          let id = seqArray[i]
      
          let job = await this.thingsToUpvoteQueue.add(`Job:t3_${id}`, { thing: 
            { id: `${id}`, kind: 't3', name: `t3_${id}`, parent_id: null, permalink: '' } 
          },
          { jobId: `t3_${id}`, removeOnComplete: true, removeOnFail: true, delay: (8.64e7 + (3.6e6 * (1 + i))) } // 24hr is 8.64e7
          );
        }

        return Promise.resolve(true)
    }
}