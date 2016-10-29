import {ApiEdgeDefinition, ApiEdgeError, ApiEdgeQueryResponse, Api, ApiRequestType} from "api-core";
import {ApiQueryStringParser} from "./ApiQueryStringParser";

export class EllipseApiRouter {

    defaultApi: Api;
    apis: Api[];

    private apiVersions: string[];

    constructor(...apis: Api[]) {
        this.apis = apis;
        this.defaultApi = apis[0];

        this.apiVersions = apis.map(api => api.version);
    }

    apply = (app: any) => {
        let router = this;

        app.all('/v:version/*', function(req: any, res: any, next: any) {
            let index = router.apiVersions.indexOf(req.params.version);
            if(index == -1) {
                this.error = new ApiEdgeError(400, "Unsupported API version");
                next()
            }
            else {
                this.api = router.apis[index];
                req.apiPath = req.path.replace(`/v${this.api.version}/`, '');
                next()
            }
        });

        app.all('/*', function (req: any, res: any, next: any) {
            if(!this.api) {
                this.api = router.defaultApi;
                req.apiPath = req.path.replace('/', '');
            }

            next()
        });

        app.use(function(req: any, res: any, next: any) {
            if(this.error || !this.api) next();
            else {
                try {
                    let request = this.api.parseRequest(req.apiPath.split('/'));

                    if(!request.path.segments.length) {
                        this.error = new ApiEdgeError(404, 'Not Found');
                        return next()
                    }

                    request.context = ApiQueryStringParser.parse(req.query, request.path);

                    if (req.body) {
                        request.body = req.body;
                    }

                    switch(req.method) {
                        case "GET":
                            request.type = ApiRequestType.Read;
                            break;
                        case "POST":
                            request.type = ApiRequestType.Create;
                            break;
                        case "PUT":
                            request.type = ApiRequestType.Update;
                            break;
                        case "PATCH":
                            request.type = ApiRequestType.Patch;
                            break;
                        case "DELETE":
                            request.type = ApiRequestType.Delete;
                            break;
                    }

                    let query = this.api.buildQuery(request);

                    query.execute()
                        .then((resp: ApiEdgeQueryResponse) => {
                            this.json = resp.data;

                            if(resp.metadata) {
                                if(resp.metadata.pagination) {
                                    const total = resp.metadata.pagination.total || 0,
                                        limit = +req.query.limit || ApiQueryStringParser.defaultLimit;
                                    res.setHeader('X-Total-Count', req.query.page ? Math.ceil(total / limit) : total);
                                }
                            }

                            this.send()
                        })
                        .catch((e: any) => {
                            this.error = e;
                            next()
                        })
                }
                catch (e) {
                    this.error = e;
                    next()
                }
            }
        });

        app.use(function () {
            let e = this.error;
            if(e instanceof ApiEdgeError) {
                this.status = e.status;
                this.send(e.message);
            }
            else {
                this.status = 500;
                this.send("Internal Server Error");
            }
        });
    };

}
