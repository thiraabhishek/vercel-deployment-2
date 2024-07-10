import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { UserType } from "../utils/usertype";
import userExist from "../utils/IsUserExist";

export const getTokenFrom = (request: Request) => {
  const authorization = request.get("authorization");

  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.split(" ")[1];
  }
  return null;
};

export interface RequestAuthType extends Request {
  auth?: { userId?: any };
}

const userAuthentication = async(
  req: RequestAuthType,
  res: Response,
  next: NextFunction
) => {
  try{
  const token = getTokenFrom(req);

  const decodedToken = jwt.verify(token!, process.env.SECRET!) as UserType;

  if (!decodedToken.userId) {
    return res.status(401).json({ error: "token missing or invalid token" });
  }

  if (!req.body) {
    return res.status(400).json({ error: "content missing" });
  }
  
  const { user_id, is_exist } = await userExist(
    decodedToken.userId
  );

  if (is_exist === 0) {
    return res.status(401).json({ error: "Invalid Auth" });
  }

  req["auth"] = {
    userId: user_id,
  };

  next();
}
catch(err){
  return res.status(401).json({ error: "Invalid Auth" });
}
};

const socketAuthentication = async (socket: any, next: any) => {
  try {
    const token = socket.handshake.query.auth;

    const decodedToken = jwt.verify(token, process.env.SECRET!) as UserType;
    console.log('dec',decodedToken);
    socket.data = decodedToken.userId;

    next();
  } catch (error) {
    console.error("Authentication error", error);
    next(new Error("Authentication error"));
  }
};

const adminAuthentication = async (
  req: RequestAuthType,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getTokenFrom(req);

    const decodedToken = jwt.verify(token!, process.env.SECRET!) as UserType;

    if (!decodedToken.userId) {
      return res.status(401).json({ error: "token missing or invalid token" });
    }

    if (!req.body) {
      return res.status(400).json({ error: "content missing" });
    }

    // if (
    //   !decodedToken.tokenSign.user_role ||
    //   decodedToken.tokenSign.user_role !== "Admin"
    // ) {
    //   return res.status(401).json({ error: "Invalid Auth" });
    // }

    const { user_id, is_exist } = await userExist(
      decodedToken.userId
    );


    if (is_exist === 0) {
      return res.status(401).json({ error: "Invalid Auth" });
    }

    req["auth"] = {
      userId: user_id,
    };

    next();
  } catch (error) {
    console.log('error',error);
    return res.status(401).json({ error: "Invalid Auth" });
  }
};
export { userAuthentication, socketAuthentication, adminAuthentication };
