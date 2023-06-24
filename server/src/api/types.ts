import { Request } from "express";
import { AppServices } from "../core/bootstrap.js";

export interface AppRequest extends Request {
    services: AppServices
}