import { Request } from "express";
import { AuthContext, AppServices } from "../core/index.js";

export interface AppRequest extends Request {
    services: AppServices;
    authContext: AuthContext;
}