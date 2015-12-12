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
    },
    workerInterval: process.env.APP_WORKER_INTERVAL || 900000, // 15min default
    googleSearchAPI : {
        url: process.env.GOOGLE_API_URL,
        key: process.env.GOOGLE_API_KEY,
        cx:  process.env.GOOGLE_API_CX
    }
};
