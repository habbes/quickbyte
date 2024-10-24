
export interface LinkGeneratorConfig {
    webappBaseUrl: string;
}

export class LinkGenerator {
    constructor(private config: LinkGeneratorConfig) {

    }

    getProjectUrl(projectId: string) {
        return `${this.config.webappBaseUrl}/projects/${projectId}`;
    }

    getMediaUrl(projectId: string, mediaId: string) {
        return `${this.getProjectUrl(projectId)}/player/${mediaId}`;
    }

    getMediaVersionUrl(projectId: string, mediaId: string, versionId: string) {
        return `${this.getMediaUrl(projectId, mediaId)}?version=${versionId}`;
    }

    getMediaCommentUrl(projectId: string, mediaId: string, commentId: string, versionId?: string) {
        const base = `${this.getProjectUrl(projectId)}/player/${mediaId}?comment=${commentId}`;
        if (versionId) {
            return `${base}&version=${versionId}`;
        }

        return base;
    }

    getProjectShareLink(shareId: string, code: string) {
        return `${this.config.webappBaseUrl}/share/${shareId}/${code}`;
    }
}
