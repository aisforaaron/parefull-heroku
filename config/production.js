module.exports = {
    env: 'production',
    host: 'parefull.herokuapp.com',
    address: '127.0.0.1',
    port: 4000,
    secret: "Your secret here",
    imgPath: '/app/docroot/assets/images/bits/',
    bitFilePath: 'https://s3-us-west-2.amazonaws.com/parebits/bits/production/',
    bitBucketName: 'parebits',
    bitImgAllowedExt: ['jpeg', 'png', 'jpg'],
    db: {
        url: process.env.MONGO_URL
    },
    workerInterval: process.env.APP_WORKER_INTERVAL || 900000, // 15min default
    googleSearchAPI: {
        url: process.env.GOOGLE_API_URL,
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_API_CX
    },
    apiSecret: process.env.APP_API_SECRET,
    apiUser: {
        name: process.env.APP_API_USER,
        password: process.env.APP_API_PASSWORD
    },
    logging: {
        enable: false
    }
};
