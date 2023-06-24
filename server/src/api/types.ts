import { Request } from "express";
import { AppServices } from "../core/app.js";

export interface AppRequest extends Request {
    services: AppServices
}