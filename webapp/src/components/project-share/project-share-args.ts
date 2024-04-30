import type { ProjectShareItemRef } from "@quickbyte/common";

export interface ProjectShareActionArgs {
    projectId: string;
    name: string;
    public: boolean;
    expiresAt?: Date;
    allowComments: boolean;
    allowDownload: boolean;
    showAllVersions: boolean;
    // TODO: make this optional when we add support for "allItems"
    items: ProjectShareItemRef[];
    hasPassword: boolean;
    password?: string;
    recipients: Array<{ email: string }>
}