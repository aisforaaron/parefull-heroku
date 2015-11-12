module.exports = {
    env : 'development',
    address : '127.0.0.1',
    port : 4000,
    secret : "Your secret here",
    bitFilePath: 'https://s3-us-west-2.amazonaws.com/parebits/bits/development/',
    db : {
        url : 'mongodb://localhost/local'
    },
    redis : {
        url: 'redis://127.0.0.1:6379?prefix=q'
    }
};
