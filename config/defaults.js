module.exports = {
    env : 'default',
    address : '127.0.0.1',
    port : 4000,
    secret : "Your secret here",
    bitFilePath:'docroot/assets/images/bits/',
    db : {
        url : 'mongodb://localhost/local'
    },
    redis : {
        url: 'redis://127.0.0.1:6379?prefix=q'
    }
};
