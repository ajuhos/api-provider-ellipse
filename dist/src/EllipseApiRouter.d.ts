import { Api } from "api-core";
import { Router } from "ellipse";
export declare class EllipseApiRouter extends Router {
    defaultApi: Api;
    apis: Api[];
    private apiVersions;
    constructor(...apis: Api[]);
    apply: (app: any) => void;
}
