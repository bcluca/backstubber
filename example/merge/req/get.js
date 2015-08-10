module.exports = {
    userAgent : function (data, req) {
        return req.headers['user-agent'];
    },
    query : function (data, req) {
        return req.query;
    }
};
