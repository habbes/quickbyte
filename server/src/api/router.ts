import { Router } from 'express';
import { routes } from './routes.js';

export function createRouter() {
    const router = Router();

    router.use("/", routes);

    return router;
}
