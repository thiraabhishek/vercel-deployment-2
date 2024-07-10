import "dotenv/config";
const port = process.env.PORT || 3002;
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import app from "./App";
import { Connection } from "./api/utils/mongooseconnect";
import CoreModel from "./api/services/CoreService";
import ProjectModel from "./api/services/ProjectService";
import { socketAuthentication } from "./api/middlewares/UserAuthentication";
import Helper from "./api/services/Helper";
const helper = new Helper();
export interface RequestAuthType extends Socket {
  user: number;
}

const core = new CoreModel();
const project = new ProjectModel();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(socketAuthentication).on("connection", (socket) => {
//*Call Socket

  socket.on("handle_call_disconnect", async (data) => {
    const { messageId,type } = data;

    await helper.CancellCallNotification(
      socket.data,
      data.other_user,
      data.message_thread_id,
      data.callType,
    );

    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.HandleCallDisconnect(
      messageId,
      socket.data,
      data.message_thread_id,
      type
    );

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }
    socket.nsp.to(threadId).emit("receive_call_disconnect", messageData);
  });

  socket.on("handle_no_response", async (data) => {
    const { messageId } = data;

    await helper.CancellCallNotification(
      socket.data,
      data.other_user,
      data.message_thread_id,
      data.callType
    );

    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.HandleNoResponse(
      messageId,
      socket.data,
      data.message_thread_id
    );

    console.log("data", messageData, threadId, error, errorMessage);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }
    socket.nsp.to(threadId).emit("receive_call_disconnect", messageData);
  });
//*Call Socket


//*Message Socket
  socket.on("join_room", (data) => {
    socket.join(data);
  });

  socket.on("ping", async (data) => {
    const {
      data: messageData,
      error,
      errorMessage,
    } = await core.SendMessage(data, socket.data);

    if (error) {
      socket.to(data.message_thread_id).emit("error", errorMessage);
      return
    }
    socket.nsp.to(data.message_thread_id).emit("receive_message", messageData);
  });

  socket.on("update_ping", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await core.UpdateMessage(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receive_message", messageData);
  });
//*Message Socket

  //*Tribe Socket
  socket.on("join_tribe", async (data) => {
    socket.join(data);

    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("tribe_message", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeSendMessage(data, socket.data);
    
    console.log('messageData=>',messageData,
      threadId,
      error,
      errorMessage,);


    if (error) {
      socket.emit("error", `${errorMessage}`);
      console.log('I worked');
      return
    }

    socket.nsp.to(threadId).emit("receive_tribe_message", messageData);
  });

  socket.on("tribe_send_react", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeSendReact(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receive_tribe_react", messageData);
  });


  socket.on("tribe_add_comment", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeAddComment(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receive_tribe_comment", messageData);
  });


  socket.on("tribe_add_like", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeAddLike(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }
    console.log('message',messageData);

    socket.nsp.to(threadId).emit("receive_tribe_like", messageData);
  });

  socket.on("tribe_send_comment_reply", async (data) => {
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeAddCommentReply(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }
    console.log('message',messageData);

    socket.nsp.to(threadId).emit("receive_tribe_comment_reply", messageData);
  });

  socket.on("tribe_update_message", async (data) => {
    const { id } = data;

    const updatePayload = { ...data };

    delete updatePayload.id;

    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeUpdateMessage(updatePayload, socket.data, id);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receive_tribe_message", messageData);
  });


  socket.on("tribe_delete_post", async (data) => {
 
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeDeletePost(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receive_tribe_delete_post", messageData);
  });

  socket.on("tribe_comment_action", async (data) => {
 
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeCommentAction(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receieve_tribe_comment_action", messageData);
  });

  socket.on("tribe_comment_reply_action", async (data) => {
 
    const {
      data: messageData,
      threadId,
      error,
      errorMessage,
    } = await project.TribeCommentReplyAction(data, socket.data);

    if (error) {
      socket.emit("error", `${errorMessage}`);
      return
    }

    socket.nsp.to(threadId).emit("receieve_tribe_comment_reply_action", messageData);
  });


  // socket.on("tribe_comment_action", async (data) => {
 
  //   const {
  //     data: messageData,
  //     threadId,
  //     error,
  //     errorMessage,
  //   } = await project.TribeCommentAction(data, socket.data);

  //   if (error) {
  //     socket.emit("error", `${errorMessage}`);
  //     return
  //   }

  //   socket.nsp.to(threadId).emit("receieve_tribe_comment_action", messageData);
  // });

  //*Tribe Socket

});
io.engine.on("connection_error", (err) => {
  console.log("error=>1", err.req);
  console.log("error=>2", err.code);
  console.log("error=>3", err.message);
  console.log("error=>4", err.context);
});
Connection();
server.listen(port, () => {
  console.log(`Server Started at ${port}`);
});
