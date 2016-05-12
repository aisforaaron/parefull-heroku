module.exports = {
    env: 'default',
    host: '',
    address: '127.0.0.1',
    port: 4000,
    secret: "Your secret here",
    imgPath: 'assets/images/bits',
    bitFilePath: 'docroot/assets/images/bits/',
    bitBucketName: 'parebits',
    bitImgAllowedExt: ['jpeg', 'png', 'jpg'],
    db: {
        url: 'mongodb://localhost/local'
    },
    workerInterval: process.env.APP_WORKER_INTERVAL || 900000, // 15min default
    googleSearchAPI: {
        url: process.env.GOOGLE_API_URL,
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_API_CX
    },
    apiSecret: process.env.APP_API_SECRET,
};
