import express from 'express';
import { Job, Queue, Worker, QueueScheduler } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
const { rando, randoSequence } = require('@nastyox/rando.js');

const thingsToUpvoteQueue = new Queue('ThingsToUpvoteQueue');
const thingsToUpvoteQueueScheduler = new QueueScheduler(thingsToUpvoteQueue.name);
const maxUpvotePathCount = 100;
const serverAdapter = new ExpressAdapter();
const app = express();

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(thingsToUpvoteQueue )],
  serverAdapter: serverAdapter,
});


const thingsToUpvoteQueueWorker = new Worker(thingsToUpvoteQueue.name, async (job: Job) => {
  // Do Nothing
  return true;
});

thingsToUpvoteQueueWorker.on('error', err => { console.error(err) });

const run = async () => {

  // adding jobs to ThingsToUpvoteQueue demo
  async function addJobs() {

    const seqArray: number[] = randoSequence(1, 100)

    for(let i = 0; i < 100; i++) {
      let id = seqArray[i]

      let job = await thingsToUpvoteQueue.add(`Job:t3_${id}`, { thing: 
        { id: `${id}`, kind: 't3', name: `t3_${id}`, parent_id: null, permalink: '' } 
      },
      { jobId: `t3_${id}`, removeOnComplete: true, removeOnFail: true, delay: (8.64e7 + (3.6e6 * (1 + i))) } // 24hr is 8.64e7
      );
    }
  }
  
  await addJobs()
  ////////



  // generating upvote path demo
  const queueCount = await thingsToUpvoteQueue.count()
  const user = { // a mock User
    "id": "ac2bf69111"
  }

  const userQueue = new Queue(`User:${user.id}:UpvoteQueue`)
  const userQueueScheduler = new QueueScheduler(userQueue.name);
  const userQueueWorker = new Worker(userQueue.name, async (job: Job) => {
    // send payload to client

    return true;
  });

  userQueueWorker.on('error', err => { console.error(err) });

  let seqArray: number[]
  let seqArrayReduced: number[]

  // add this queue to the Bull board
  addQueue(new BullMQAdapter(userQueue))

  if(queueCount > 0) {
    seqArray = randoSequence(0, (queueCount - 1))

    if(seqArray.length > maxUpvotePathCount) {
      seqArrayReduced = seqArray.slice(0, 100)

      
      for(let ele of seqArrayReduced) {
        const jobs = await thingsToUpvoteQueue.getJobs(null, ele, ele)
        const job = jobs.pop()

        if(job instanceof Job) {
          // create user's queue of things to upvote
           // formula for delay option:
            // (60k-120k ms) * Queue.count

          const delay = rando(60000,120000) * await userQueue.count().then(cnt => { return cnt ? cnt : 1 })
          userQueue.add(`${job.name}`,job.data, {...job.opts, delay})
        }
      }
    } else {
        for(let ele of seqArray) {
          const jobs = await thingsToUpvoteQueue.getJobs(null, ele, ele)
          const job = jobs.pop()

          if(job instanceof Job) {
            // create user's queue of things to upvote
             // formula for delay option:
              // (60k-120k ms) * Queue.count

            const delay = rando(60000,120000) * await userQueue.count().then(cnt => { return cnt ? cnt : 1 })
            userQueue.add(`${job.name}`,job.data, {...job.opts, delay})
          }
        }      
    }

  } else {
      // do nothing?
  }
  ////////

  thingsToUpvoteQueueWorker.on('completed', job => {
    // Called every time a job is completed in any worker.
    console.log(`thingsToUpvoteQueue Job completed: ${job.id}`)
  })
  
  thingsToUpvoteQueueWorker.on('failed', (job, error) => {
    console.log(`thingsToUpvoteQueue Job failed: ${job.id}; ${error}`)
  })

  userQueueWorker.on('completed', job => {
    // TODO check userQueue.count and refill if empty
    console.log(`userQueue Job completed: ${job.id}`)
  })

  userQueueWorker.on('failed', (job, error) => {
    console.log(`userQueue Job failed: ${job.id}; ${error}`)
  })



  serverAdapter.setBasePath('/admin/queues');
  app.use('/admin/queues', serverAdapter.getRouter());
  
  app.listen(3000, () => {
    console.log('Running on 3000...');
    console.log('For the UI, open http://localhost:3000/admin/queues');
    console.log('Make sure Redis is running on port 6379 by default!');
  });

  // uncomment to destroy a queue's jobs
  // thingsToUpvoteQueue.obliterate()
}

run().catch((e) => console.error(e));