import passport from "passport";
import { IUser } from "../../modules/User/User.types";
import { Request, Response, NextFunction } from "express";
import AuthError from "../error/AuthError";
import localStrategy from "./localStrategy";
import jwtStrategy from "./jwtStrategy";

passport.use("local", localStrategy);
passport.use("jwt", jwtStrategy);

export interface AuthRequest extends Request {
  user: IUser;
}

const passportHandler = (strategy: string) => {
  return function (req: Request, res: Response, next: NextFunction) {
    passport.authenticate(
      strategy,
      { session: false },
      (err: any, user?: IUser | false) => {
        if (err) return next(err);
        if (!user) return next(new AuthError());
        (req as AuthRequest).user = user;
        next();
      }
    )(req, res, next);
  };
};

export const authLocal = passportHandler("local");
export const authJwt = passportHandler("jwt");
