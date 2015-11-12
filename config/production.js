module.exports = {
    env : 'production',
    address : '127.0.0.1',
    port : 4000,
    secret : "Your secret here",
    bitFilePath: 'https://s3-us-west-2.amazonaws.com/parebits/bits/production/',
    db : {
      url : process.env.MONGO_URL
    },
    redis : {
        url: process.env.REDIS_URL
    }
};
