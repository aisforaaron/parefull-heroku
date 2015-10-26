module.exports = {
    env : 'default',
    address : '127.0.0.1',
    port : process.env.PORT || 4000,
    secret : "Your secret here",
    db : {
        url : 'mongodb://localhost/local'
    }
};
