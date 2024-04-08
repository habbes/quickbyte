import express, { Router } from 'express';
import cors from 'cors';
import { routes } from './routes.js';

export function createRouter() {
    const router = Router();

    router.use(express.json());
    router.use(cors());
    router.use("/", routes);

    return router;
}
