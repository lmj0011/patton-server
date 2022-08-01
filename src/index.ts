import express from 'express';
import { Server } from "socket.io";
import { PattonSocket } from './types/socket.io';
import chalk from 'chalk';
import Randoma from 'randoma';
import { QueueManager } from './QueueManager';
import { RedditThing } from './RedditThing';

const app = express();
const queueManager = new QueueManager();
const randoma = new Randoma({seed: 512});
const port = 3000;

const expressServer = app.listen(port, () => {
  console.log(`Server listening at port ${port}`);
})

const io = new Server(expressServer);


const run = async () => {

  // @ts-ignore: Argument of type '(socket: PattonSocket) => Promise<void>' is not assignable to parameter of type '(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => void'
  io.on('connection', async (socket: PattonSocket) => {
    
    io.timeout(5000).to(socket.id).emit("ackConnection", `Your session id is ${socket.id}`, async (err: any, response: any) => {
      if (err) console.error(err)

      socket.socketIoServer = io
      socket.logColorFilter = chalk.hex(randoma.color(0.5).hex().toString())
      socket.console = (message) => {
        console.log(socket.logColorFilter(message))
      }
      // generate client upvote queue
      await queueManager.createSocketQueue(socket)

      socket.console(`Socket ${socket.id} replied: ${response}`)

      // globally broadcast the updated client count
      io.emit("numberOfClientsOnline", { numOnline: io.sockets.sockets.size })
      console.log(`numberOfClientsOnline: ${io.sockets.sockets.size}`)
    })


    // when the client emits 'upvoteSubmission', this listens and executes
    socket.on('upvoteSubmission', async (data) => {
      try {
          // verify this is a reddit url and extract the necessary data from url string
        const thing = new RedditThing(data.url)

        // add to thingsToUpvoteQueue
        const job = await queueManager.addJobToThingsToUpvoteQueue(io, thing)
    
        socket.console(`Added job ${job.data.thing.name} to thingsToUpvoteQueue`)

        // return status message to client
        if(thing.kind == "t1") {
          io.timeout(5000).to(socket.id)
          .emit("log", `Your Comment ${thing.fullName}, was submitted successfully`)
        }

        if(thing.kind == "t3") {
          io.timeout(5000).to(socket.id)
          .emit("log", `Your Post ${thing.fullName}, was submitted successfully`)
        }
      } catch(err: any) {
        io.timeout(5000).to(socket.id).emit("log", err.message)
        console.error(err)
      }
    });
  
    // // when the client emits 'new message', this listens and executes
    // socket.on('new message', (data) => {
    //   // we tell the client to execute 'new message'
    //   socket.broadcast.emit('new message', {
    //     username: socket.username,
    //     message: data
    //   });
  
    //   console.log(`${socket.username}: ${data}`);
    // });
  
    // // when the client emits 'add user', this listens and executes
    // socket.on('add user', (username) => {
    //   if (addedUser) return;
  
    //   // we store the username in the socket session for this client
    //   socket.username = username;
    //   ++numUsers;
    //   addedUser = true;
    //   socket.emit('login', {
    //     numUsers: numUsers
    //   });
    //   // echo globally (all clients) that a person has connected
    //   socket.broadcast.emit('user joined', {
    //     username: socket.username,
    //     numUsers: numUsers
    //   });
    // });
  
    // // when the client emits 'typing', we broadcast it to others
    // socket.on('typing', () => {
    //   socket.broadcast.emit('typing', {
    //     username: socket.username
    //   });
    // });
  
    // // when the client emits 'stop typing', we broadcast it to others
    // socket.on('stop typing', () => {
    //   socket.broadcast.emit('stop typing', {
    //     username: socket.username
    //   });
    // });
  
    // when the user disconnects.. perform this
    socket.on('disconnect', async () => {

      // destroy queue when client disconnects
      await socket.upvoteQueueWorker.close()
      await socket.upvoteQueueScheduler.close()
      await socket.upvoteQueue.obliterate()

      socket.console(`Socket ${socket.id} has disconnected`);

      // globally broadcast the updated client count
      io.emit("numberOfClientsOnline", { numOnline: io.sockets.sockets.size })
      console.log(`numberOfClientsOnline: ${io.sockets.sockets.size}`)
    });
  });
}

run().catch((e) => console.error(e));