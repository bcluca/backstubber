module.exports = {
    _$$ : function (data, req, res) {
        res.statusCode = 200;          // Change status code from 404 to 200
        res.headers.status = '200 OK'; // Update status header (github sends that too)
        return true;
    },
    headers : function (data, req, res) {
        console.log(res.body);         // You can access the original response body
        return res.headers;            // Just to show updated headers
    }
};
