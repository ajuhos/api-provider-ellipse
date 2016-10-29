"use strict";
const api_core_1 = require("api-core");
const excludedKeys = ["sort", "embed", "fields", "skip", "limit", "page"];
function extractWhereClauseParts(key) {
    let parts = [];
    while (key.length) {
        if (key[0] !== '[') {
            throw new api_core_1.ApiEdgeError(400, `Invalid Where Clause`);
        }
        const endOfPart = key.indexOf(']');
        if (endOfPart < 2) {
            throw new api_core_1.ApiEdgeError(400, `Invalid Where Clause`);
        }
        parts.push(key.substring(1, endOfPart));
        key = key.substring(endOfPart + 1);
    }
    return parts;
}
class ApiQueryStringParser {
    static parse(query, path) {
        let context = new api_core_1.ApiEdgeQueryContext(), lastSegment = path.segments[path.segments.length - 1];
        if (!lastSegment) {
            throw new api_core_1.ApiEdgeError(400, "Invalid Query Parameters");
        }
        const edge = lastSegment.edge, oneToOneRelations = edge.relations.filter(r => r instanceof api_core_1.OneToOneRelation).map(r => r.name);
        if (query.fields) {
            query.fields.split(',').forEach((field) => {
                if (edge.fields.indexOf(field) == -1) {
                    throw new api_core_1.ApiEdgeError(400, `Invalid Field: ${field}`);
                }
                context.field(field);
            });
        }
        if (query.embed) {
            query.embed.split(',').forEach((field) => {
                const relationId = oneToOneRelations.indexOf(field);
                if (relationId == -1) {
                    throw new api_core_1.ApiEdgeError(400, `Invalid Related Field: ${field}`);
                }
                context.populate(edge.relations[relationId].relationId);
            });
        }
        if (query.sort) {
            query.sort.split(',').forEach((s) => {
                const field = s.substring(s[0] == '-' ? 1 : 0), direction = s[0] !== '-';
                if (edge.fields.indexOf(field) == -1) {
                    throw new api_core_1.ApiEdgeError(400, `Invalid Field: ${field}`);
                }
                context.sort(field, direction);
            });
        }
        let limit = +query.limit, skip = +query.skip, page = +query.page;
        if (limit === limit ||
            skip === skip ||
            page === page) {
            limit = limit || ApiQueryStringParser.defaultLimit;
            if (page)
                skip = (page - 1) * limit;
            else
                skip = skip || 0;
            context.paginate(skip, limit);
        }
        Object.keys(query).forEach(key => {
            if (query.hasOwnProperty(key)) {
                const value = query[key];
                if (key.substring(0, 5) == "where") {
                    key = key.substring(5);
                    const parts = extractWhereClauseParts(key);
                    if (parts.length == 1) {
                        key = parts[0];
                        if (edge.fields.indexOf(key) == -1) {
                            throw new api_core_1.ApiEdgeError(400, `Invalid Field: ${key}`);
                        }
                        context.filter(key, api_core_1.ApiEdgeQueryFilterType.Equals, value);
                    }
                    else if (parts.length == 2) {
                        key = parts[1];
                        if (edge.fields.indexOf(key) == -1) {
                            throw new api_core_1.ApiEdgeError(400, `Invalid Field: ${key}`);
                        }
                        switch (parts[0]) {
                            case 'eq':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.Equals, value);
                                break;
                            case 'ne':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.NotEquals, value);
                                break;
                            case 'gt':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.GreaterThan, value);
                                break;
                            case 'gte':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.GreaterThanOrEquals, value);
                                break;
                            case 'lt':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.LowerThan, value);
                                break;
                            case 'lte':
                                context.filter(key, api_core_1.ApiEdgeQueryFilterType.LowerThanOrEquals, value);
                                break;
                            default:
                                throw new api_core_1.ApiEdgeError(400, `Invalid Filter Operator: ${parts[0]}`);
                        }
                    }
                }
                else {
                    if (edge.fields.indexOf(key) == -1) {
                        throw new api_core_1.ApiEdgeError(400, `Invalid Field: ${key}`);
                    }
                    context.filter(key, api_core_1.ApiEdgeQueryFilterType.Equals, value);
                }
            }
        });
        return context;
    }
}
ApiQueryStringParser.defaultLimit = 10;
exports.ApiQueryStringParser = ApiQueryStringParser;
//# sourceMappingURL=ApiQueryStringParser.js.map