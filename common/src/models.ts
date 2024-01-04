import { z } from "zod";

export const CreateTransferMetaSchema = z.object({
    name: z.string(),
    provider: z.string(),
    region: z.string(),
    
});

export interface CreateShareableTransferArgs {
    name: string;
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: CreateTransferMeta;
}

export interface CreateTransferFileArgs {
    name: string;
    size: number;
}

interface CreateTransferMeta {
    ip?: string;
    countryCode?: string;
    state?: string;
    userAgent?: string;
}