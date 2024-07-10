//  async TribeSendMessage(data:{userId:string;id:string,message:string;message_type:string}) {
//     const userId = data.userId

//     const id  = data.id
    
//     const { message, message_type } = data

//     const isTribeMember = `SELECT * FROM tribe_member WHERE tm_relation_id = ? AND tm_member_id = ? AND tm_request_status = 'Accepted'`

//     const isTribeAdmin = `SELECT * FROM tribe WHERE tribe_id=? AND tribe_author_id=?`

//     const findTribeQuery = `SELECT * FROM tribe WHERE tribe_id=? `

//     const time = Time()

//     const payload = { tc_author_id: userId, tc_message_created_at: time, tc_message_type: message_type, tc_message: message, tc_tribe_id: id }

//     const { insertQuery, insertParams } = insertDataQuery('tribe_chat', payload)

//     const findTribeMessage = `SELECT * FROM tribe_chat WHERE tc_id = ?`
    
//     const result={error:false,data:{},threadId:id,errorMessage:""}

//     try {
//       const [isTribeMemberExecute] = await con.query<RowDataPacket[]>(isTribeMember, [id, userId])

//       const [isTribeAdminExecute] = await con.query<RowDataPacket[]>(isTribeAdmin, [id, userId])

//       if (isTribeMemberExecute.length === 0 && isTribeAdminExecute.length === 0) {
//         result.error=true

//         result.errorMessage="No tribe found"
        
//         return result
//       }
//       const [findTribeExecute] = await con.query<RowDataPacket[]>(findTribeQuery, [id])

//       const { tribe_author_id, tribe_title } = findTribeExecute[0]
      
//       helper.PushNotification(id, userId, message, tribe_author_id, tribe_title)

//       const [insertTribeMessage] = await con.query<ResultSetHeader>(insertQuery, insertParams)

//       const [findTribeMessageExecute] = await con.query<RowDataPacket[]>(findTribeMessage, [insertTribeMessage.insertId])

//       const removeNullTribeMessage = isValEmpty(findTribeMessageExecute[0] || {})

//       result.data=removeNullTribeMessage
      
//       return result
    
//     } catch (error) {
//       logger.error(`${error}`)
//       result.error=true

//       result.errorMessage="Something went wrong"

//       return result
//     }
//   }



// async UpdateMessage(data:{userId:string;id:string;message:string;message_type:string}) {
//     const userId = data.userId

//     const time = Time()

//     const { id } = data

//     const { message, message_type } = data

//     // if (!id) {
//     //   return res.status(400).json({ status: 0, message: 'Message ID is required' })
//     // }

//     // const payload = { ...req.body, message_author_id: userId, message_time: time }

//     const setLastMessage = message_type === 'audio' ? 'Audio file' : message_type === 'image' ? 'Image file' : message

//     const updateMessageQuery = `UPDATE messages SET message=?, message_type=?, message_time=?, message_is_edited=1 WHERE message_id=? AND message_author_id=?`

//     const findMessageQuery = `SELECT * FROM messages WHERE message_id=?`

//     const updateThreadQuery = `UPDATE threads SET thread_last_message='${setLastMessage}', thread_time=${time} WHERE thread_id=?`
   
//     const result={error:false,data:{},threadId:id,errorMessage:""}

//     try {
//       const [messageResult] = await con.query<RowDataPacket[]>(findMessageQuery, [id])

//       if (messageResult.length === 0) {
//         // return res.status(404).json({ status: 0, message: 'Message not found or you are not the author' })
//         result.error=true

//         result.errorMessage="Message not found or you are not the author"
        
//         return result
//       }

//       const thread_id = messageResult[0].message_thread_id

//       const updateMessageExecute = con.query<ResultSetHeader>(updateMessageQuery, [message, message_type, time, id, userId])

//       const updateThreadExecute = con.query<ResultSetHeader>(updateThreadQuery, [thread_id])

//       await Promise.all([updateMessageExecute, updateThreadExecute])

//       const [updatedMessageResult] = await con.query<RowDataPacket[]>(findMessageQuery, [id])

//       const removeNullMessage = isValEmpty(updatedMessageResult[0])
      
//       result.data=removeNullMessage

//       return result
    
//     } catch (error) {
//       logger.error(`${error}`)

//       result.error=true

//       result.errorMessage="Something went wrong"
      
//       return result

//     }
//   }