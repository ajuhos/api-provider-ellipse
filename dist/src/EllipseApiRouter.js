"use strict";
const api_core_1 = require("api-core");
const ApiQueryStringParser_1 = require("./ApiQueryStringParser");
class EllipseApiRouter {
    constructor(apis) {
        this.apply = (app) => {
            let router = this;
            app.all('/v:version/*', function (req, res, next) {
                let index = router.apiVersions.indexOf(req.params.version);
                if (index == -1) {
                    this.error = new api_core_1.ApiEdgeError(400, "Unsupported API version");
                    next();
                }
                else {
                    this.api = router.apis[index];
                    req.apiPath = req.path.replace(`/v${this.api.version}/`, '');
                    next();
                }
            });
            app.all('/*', function (req, res, next) {
                if (!this.api) {
                    this.api = router.defaultApi;
                    req.apiPath = req.path.replace('/', '');
                }
                next();
            });
            app.use(function (req, res, next) {
                if (this.error || !this.api)
                    next();
                else {
                    try {
                        let request = this.api.parseRequest(req.apiPath.split('/'));
                        if (!request.path.segments.length) {
                            this.error = new api_core_1.ApiEdgeError(404, 'Not Found');
                            return next();
                        }
                        request.context = ApiQueryStringParser_1.ApiQueryStringParser.parse(req.query, request.path);
                        if (req.body) {
                            request.body = req.body;
                        }
                        switch (req.method) {
                            case "GET":
                                request.type = api_core_1.ApiRequestType.Read;
                                break;
                            case "POST":
                                request.type = api_core_1.ApiRequestType.Create;
                                break;
                            case "PUT":
                                request.type = api_core_1.ApiRequestType.Update;
                                break;
                            case "PATCH":
                                request.type = api_core_1.ApiRequestType.Patch;
                                break;
                            case "DELETE":
                                request.type = api_core_1.ApiRequestType.Delete;
                                break;
                        }
                        let query = this.api.buildQuery(request);
                        query.request = request;
                        query.execute(req.user)
                            .then((resp) => {
                            if (resp.metadata) {
                                if (resp.metadata.pagination) {
                                    const total = resp.metadata.pagination.total || 0, limit = +req.query.limit || ApiQueryStringParser_1.ApiQueryStringParser.defaultLimit;
                                    res.setHeader('X-Total-Count', req.query.page ? Math.ceil(total / limit) : total);
                                }
                            }
                            res.json(resp.data);
                        })
                            .catch((e) => {
                            this.error = e;
                            next();
                        });
                    }
                    catch (e) {
                        this.error = e;
                        next();
                    }
                }
            });
            app.use(function () {
                let e = this.error;
                if (e instanceof api_core_1.ApiEdgeError) {
                    this.status = e.status;
                    this.send(e.message);
                }
                else {
                    this.status = 500;
                    this.send("Internal Server Error");
                }
            });
        };
        this.apis = apis;
        this.defaultApi = apis[0];
        this.apiVersions = apis.map(api => api.version);
    }
}
exports.EllipseApiRouter = EllipseApiRouter;
//# sourceMappingURL=EllipseApiRouter.js.map