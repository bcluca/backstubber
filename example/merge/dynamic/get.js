module.exports = {
    _$$ : function (data) {
        console.log(data);          // original data also available
        return Math.random() < 0.5; // dynamic merge
    },
    message : 'Updated message'     // randomly merged
};
