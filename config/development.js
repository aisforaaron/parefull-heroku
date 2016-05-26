module.exports = {
    env: 'development',
    host: '',
    address: '127.0.0.1',
    port: 4000,
    secret: 'Your secret here',
    imgPath: 'docroot/assets/images/bits/',
    bitFilePath: 'https://s3-us-west-2.amazonaws.com/parebits/bits/development/',
    bitBucketName: 'parebits',
    bitImgAllowedExt: ['jpeg', 'png', 'jpg'],
    db: {
        url: 'mongodb://localhost/local'
    },
    workerInterval: process.env.APP_WORKER_INTERVAL || 900000, // 15min default, 60000 for 1 min
    googleSearchAPI: {
        url: process.env.GOOGLE_API_URL,
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_API_CX
    },
    apiSecret: process.env.APP_API_SECRET,
    apiUser: {
        name: 'pare',
        password: 'full'
    },
    logging: {
        enable: true,
        cursePurse: '_log/parefull-cursepurse.log',
        parefull: '_log/parefull-app.log'
    }
};
