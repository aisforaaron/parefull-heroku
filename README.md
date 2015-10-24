# Parefull App

This is the Node.js web app part of the Parefull project. 

Demo can be found here: 
[Parefull.aarond.com](http://parefull.aarond.com)


## To setup locally

* Create local folder structure like so
```
parefull/           // main folder to hold app and devops
  parefull-heroku   // project codebase which communicates to Heroku
  parefull-devops   // vagrant and ansible provisioners, run vagrant up here
                    //   this also sets NFS share from ../parefull-app to VM
```

## Request Flow


### General

1. all requests come into nginx first on port 80
  location /
  *right now nothing is limiting which file types can be served
2. static assets are served from nginx (see default site conf)
  css/js/images/html
3. /api/* routes are proxy to express on port 4000 
  set in nginx conf: proxy_pass http://localhost:{{node_port}};
  /api paths proxy to expressjs
4. expressjs routing explained
  server.js loads routes/index.js
  which loads custom routes and other route files
5. nodejs response returns to UX layer (reactjs) for output


## Stack References

### Application 

* [Nginx](https://www.nginx.com/resources/wiki/)
* [nginx proxy info](http://www.nginxtips.com/how-to-setup-nginx-as-proxy-for-nodejs/)
* [Express.js](http://expressjs.com/guide/routing.html)
* [Node.js](https://nodejs.org/en/docs/)
  * [NVM](https://github.com/creationix/nvm)
* [MongoDB](https://www.mongodb.org)
* [MongooseDB](http://mongoosejs.com/docs/api.html)
* [SuperAgent](http://visionmedia.github.io/superagent/)
* [React](https://facebook.github.io/react/docs/getting-started.html)
* [Bootstrap](http://getbootstrap.com/)