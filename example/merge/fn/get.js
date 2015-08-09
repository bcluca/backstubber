module.exports = {
    _$$ : true,                             // response data takes priority
    message : function (data) {             // custom merging, _$$ ignored
        return 'Original message: ' + data; // uses original attr data
    },
    documentation_url : 'new url'           // _$$ not ignored here
};
