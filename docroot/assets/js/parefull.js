// Parefull React JS UI

var superagent   = require('superagent');


// Sub-components
// =============================================================================

var Header = React.createClass({
    render: function () {
        return (
          <TitleLogo />
        );
    }
});

var Footer = React.createClass({
    render: function () {
        return (
            <div>
              <BitsNav />
              <SecondaryNav />
            </div>
        );
    }
});

var TitleLogo = React.createClass({
    render: function () {
        return (
            <div className="row header-outer">
                <div className="col-md-6 text-left site-title">
                  <h2><a href="#">Parefull > ?</a></h2>
                </div>
                <div className="col-md-6 text-right share-buttons hidden">
                  <img src="http://placehold.it/250x50?text=Share-Buttons?" className="img-responsive pull-right"/>
                </div>
            </div>
        );
    }
});

var BitsNav = React.createClass({
    render: function () {
        return (
            <div className="row">
              <div className="col-md-12 text-center">
                <div className="btn-group">
                  <label className="btn btn-default center-block bit-add">
                    <a href="#add"><img src="http://placehold.it/200x50/4E8975/fff?text=Add+a+Bit" className="img-responsive"/></a>
                  </label>
                  <label className="btn btn-default center-block bit-score">
                    <a href="#score"><img src="http://placehold.it/200x50/8A4E62/fff?text=Score+A+Bit" className="img-responsive"/></a>
                  </label>
                  <label className="btn btn-default center-block bit-refresh">
                    <a href="#"><img src="http://placehold.it/200x50/8A764E/fff?text=Compare+Bits!" className="img-responsive"/></a>
                  </label>
                </div>
              </div>
           </div>
        );
    }
});

var SecondaryNav = React.createClass({
    render: function () {
        return (
            <div className="row secondaryNav">
              <div className="col-md-12 text-center">
                <a href="#about">About/Contact</a> | 
                <a href="#privacy">Privacy/TOS</a> | 
                <span className="copyright"> Copyright &copy; 2015 Aaron D LLC</span>
              </div>
           </div>
        );
    }
});

var AboutText = React.createClass({
  // use markdown for content display as mentioned in
  // https://facebook.github.io/react/docs/tutorial.html
  rawMarkup: function() {
    var str = ''
    // get aboutText from assets/js/site.js
    str += marked(aboutText.toString(), {sanitize: true});
    return { __html: str };
  },
  render: function (){
    return (
        <div className="about-text">
          <span dangerouslySetInnerHTML={this.rawMarkup()} />
        </div>
    );
  }
});

var PrivacyText = React.createClass({
  rawMarkup: function() {
    var str = ''
    // get privacyTOS from assets/js/site.js
    str += marked(privacyTOS.toString(), {sanitize: true});
    return { __html: str };
  },
  render: function () {
    return (
      <div className="privacy-text">
        <span dangerouslySetInnerHTML={this.rawMarkup()} />
      </div>
      );
  }
});


var CompareBox = React.createClass({
    loadBitFromServer: function () {
       // get first random bit
       superagent
        .get('/api/bit/rand')
        .end(function (err, res) {
           this.setState({bitName: res.body.name})
           this.setState({bitImg: res.body.img})
           this.setState({bitAvg: sliderText(res.body.scoreAvg)}) // remove sliderText() for just number
           var A = res.body.scoreAvg
           var skipId = res.body._id
          // call for second unique bit
          superagent
            .get('/api/bit/rand/'+skipId)
            .end(function (err, res) {
               this.setState({bitName2: res.body.name})
               this.setState({bitImg2: res.body.img})
               this.setState({bitAvg2: sliderText(res.body.scoreAvg)})
               var msg = getArrow(A,res.body.scoreAvg)
               this.setState({arrow: msg})
           }.bind(this));
        }.bind(this));
    },
    componentDidMount: function() {
      this.loadBitFromServer();
    },
    getInitialState: function() {
      return {
        bitName: '',
        bitImg: '',
        bitAvg: '',
        bitKey: '',
        arrow: ''
      };
    },
    render: function () {
        return (
            <div className="comparebox" ref="comparebox">
                <div className="row">
                    <div className="col-md-4"></div>
                    <div className="col-md-4 text-center refresh-btn">
                      <input type="button" value="Try another match!" onClick={this.loadBitFromServer} />
                    </div>
                    <div className="col-md-4"></div>
                </div>
                <div className="row bits-and-arrow">
                  <div className="col-md-4 text-center">
                    <BitBox bitName={this.state.bitName} bitAvg={this.state.bitAvg} bitImg={this.state.bitImg} bitKey="left" />
                  </div>
                  <div className="col-md-4 text-center arrow-text">
                    <div className="arrow">{this.state.arrow}</div>
                  </div>
                  <div className="col-md-4 text-center">
                    <BitBox bitName={this.state.bitName2} bitAvg={this.state.bitAvg2} bitImg={this.state.bitImg2} bitKey="right" />
                </div>
              </div>
            </div>
        );
    }
});

// format output for a bit
var BitBox = React.createClass({
    getInitialState: function() {
      return {
        bitAvg: 'orig',
        bitImg: ''
      };
    },
    render: function () {
        return (
            <div>
              <div className="row bitbox">
                <div className="col-md-12 text-center bit-img">
                  <img width="100" height="100" src={this.props.bitImg} />
                </div>
                <div className="col-md-12 text-center bit-name">
                  {this.props.bitName}
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 text-center bit-avg">
                  {this.props.bitAvg}
                </div>
              </div>
              <div className="row hidden">
                <div className="col-md-12 text-center sliderbox-outer">
                  <SliderBox />
                </div>
              </div>
            </div>
        ); 
    }
});

var SliderBox = React.createClass({
  getInitialState: function() {
    return {
      scoreDisplay: sliderText(5)
    };
  },
  update: function(){
    this.setState({
      scoreDisplay: sliderText(this.refs.inp.getDOMNode().value)
    });
  },
  render:function(){
    return (
      <div>
      <input ref="inp" type="range" min="0" max="10" name="score" onChange={this.update} />
         <label id="scoreDisplay">{this.state.scoreDisplay}</label>
      </div>
   );
  }
});

// get data for one random bit
var BitBoxRand = React.createClass({
    loadBitFromServer: function () {
      superagent
        .get('/api/bit/rand')
        .end(function (err, res) {
          if(err) throw err;
          this.setState({bitName: res.body.name});
          this.setState({bitAvg: res.body.scoreAvg});
        }.bind(this));
    },
    componentDidMount: function() {
      this.loadBitFromServer();
    },
    getInitialState: function() {
      return {
        bitNname: [],
        bitAvg: [],
        bitKey: []
      };
    },
    render: function () {
        return (
            <div>
              <BitBox bitName={this.state.bitName} bitAvg={this.state.bitAvg} bitKey='single' />
            </div>
        );
    }
});

// get a random bit and show score slider form
var ScoreBitForm = React.createClass({
    loadBitFromServer: function () {
      // get random bit to score
      // @todo - keep session list of ids to skip so user doesn't get them twice?
      superagent
        .get('/api/bit/rand')
        .end(function (err, res) {
          if(err) throw err;
          this.setState({bitName: res.body.name});
          this.setState({bitId: res.body._id});
          this.setState({bitImg: res.body.img});
        }.bind(this));
    },
    componentDidMount: function() {
      this.loadBitFromServer();
    },
    getInitialState: function() {
      return {
        bitId: '',
        bitNname: '',
        bitImg: '',
        message: ''
      };
    },
    handleSubmit: function(e) {
      e.preventDefault();
      var score = React.findDOMNode(document.forms[0].score).value.trim();
      var id    = this.refs.bitId.getDOMNode().value
      // basic form validation
      if( (score > 0) && (score < 11) && (id.length > 0) ) {
        // post new score
        superagent
          .post('/api/score')
          .send({ "_bitId": id, "score": score })
          .end(function (err, res) {
            if(err) throw err;

                 // get new bit score avg
                  superagent
                    .get('/api/score/avg/'+id)
                    .end(function (err, score) {
                      if(err) throw err;

                        // PUT call to update bit scoreAvg
                        superagent
                          .put('/api/bit/id/'+id)
                          .send({"scoreAvg": score.body})
                          .end(function (err, score) {
                            if(err) throw err;
                            this.setState({ message: res.body.message + ' Score another right meow?' });
                          }).bind(this);

                    });
          }.bind(this));
          // get new bit to score
          this.loadBitFromServer();
          React.findDOMNode(document.forms[0].score).value = 5; // set to center, default slider value
          // set label back to text that relates to 5
          React.findDOMNode(document.getElementById('scoreDisplay')).textContent = sliderText(5)

      } else {
        this.setState({ message: "Please score bit properly"})
      }
    },
    render: function () {
        return (
            <div>
            <form className="scoreBitForm" onSubmit={this.handleSubmit}>
            <input type="hidden" name="_bitId" ref="bitId" value={this.state.bitId} />
              <div className="row text-left">
                <div className="result" ref="message">{this.state.message}</div>
              </div>
              <div className="col-md-12 text-center bit-img">
                <img width="100" height="100" src={this.state.bitImg} />
              </div>
              <div className="row bitbox">
                <div className="col-md-12 text-center bit-name">
                  {this.state.bitName}
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 text-center sliderbox-outer">
                  <SliderBox />
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 text-center sliderbox-outer">
                  <input type="submit" value="Send score >>" />
                </div>
              </div>
            </form>
            </div>
        ); 
    }
});

var AddBitForm = React.createClass({
    getInitialState: function() {
      return {
        name: '',
        score: '',
        message: ''
      };
    },
    handleSubmit: function(e) {
      e.preventDefault();
      var name  = React.findDOMNode(this.refs.name).value.trim();
      var score = React.findDOMNode(document.forms[0].score).value.trim();
      // basic form validation, typeof score returns string
      if((name.length > 2) && (score > 0) && (score < 11)) {

        // POST new bit
        superagent
          .post('/api/bit')
          .send({"name": name})
          .end(function (err, res) {
            if(err) {
             throw err;
             console.log('/api/bit end err: '+err)
           }
            if(res) {

              // POST new score
              var id = res._id
              console.log('new bit id: '+res._id)
              superagent
                .post('/api/score')
                .send({ "_bitId": id, "score": score })
                .end(function (err, result) {
                  if(err) throw err;
                  console.log('new score posted')
/*                
                        // GET new bit score avg
                        superagent
                          .get('/api/score/avg/'+id)
                          .end(function (err, score) {
                            if(err) throw err;
                              console.log('new avg: '+score.body)

                              // PUT call to update bit scoreAvg
                              superagent
                                .put('/api/bit/id/'+id)
                                .send({"scoreAvg": score.body})
                                .end(function (err, score) {
                                  if(err) throw err;
                                  this.setState({ message: 'Bit saved. Add another?' });
                                }).bind(this);

                          });
*/
                }.bind(this));

              console.log('---api/bit/ POST res.body: '+JSON.stringify(res.body))
              this.setState({ message: 'Bit saved. Add another?' });
              // clear form
              React.findDOMNode(this.refs.name).value = ''; 
              React.findDOMNode(document.getElementById('scoreDisplay')).textContent = sliderText(5) 
              React.findDOMNode(document.forms[0].score).value = 5; 
            }
          }.bind(this));
        } else {
          this.setState({"message": "Please enter something (at least two characters) and give it a rating. Thx!"})
        }
    },
    render: function () {
      return (
          <div className="row bit-add-outer">
            <div className="col-md-2"></div>
            <div className="col-md-8 text-center">
              <form className="addBitForm" onSubmit={this.handleSubmit}>
              <div className="row col-md-12 text-left">
                <div className="result" ref="message">{this.state.message}</div>
              </div>
              <div className="row col-md-12 bit-name-outer text-left">
                <label>
                <input 
                  placeholder="Add a new bit to this silliness!" 
                  type="text" 
                  size="200" 
                  ref="name" 
                  name="name" 
                  className="bit-name" />
                </label>
              </div>
              <div className="row col-md-12 text-left slider-label">
                <label>Give it a score!</label>
              </div>
              <div className="row col-md-12">
                <SliderBox />
              </div>
              <div className="row col-md-12 text-left">
                <label><input type="submit" value="Add it >> " /></label>
              </div>
              </form>
            </div>
            <div className="col-md-2"></div>
        </div>
      );
    }
});

var TestBootstrap = React.createClass({
  render: function() {
    return (
        <div className="row">
          <div className="col-md-4">one col</div>
          <div className="col-md-4">two col</div>
          <div className="col-md-4">three col</div>
        </div>
   );
  }
});


// Main Components to load sub-components
// =============================================================================

var HomePage = React.createClass({
    render: function () {
        return (
            <div className="container">
              <Header />
              <CompareBox />
              <Footer />
            </div>
        );
    }
});

var AddBitPage = React.createClass({
    render: function () {
        return (
            <div className="container">
                <Header />
                <AddBitForm />
                <Footer />
            </div>
        );
    }
});

var ScoreBitPage = React.createClass({
    render: function () {
        return (
            <div className="container">
                <Header />
                <ScoreBitForm />
                <Footer />
            </div>
        );
    }
});  

var AboutPage = React.createClass({
    render: function () {
        return (
            <div className="container">
                <Header />
                <AboutText />
                <Footer />
            </div>
        );
    }
});

var PrivacyPage = React.createClass({
    render: function () {
        return (
            <div className="container">
                <Header />
                <PrivacyText />
                <Footer />
            </div>
        );
    }
});

// Routes to load main components
// =============================================================================

var App = React.createClass({
    getInitialState: function() {
        return {
            page: null
        };
    },

    componentDidMount: function() {
        var self = this;
        // Define all front end routes
        router.addRoute('', function() {
            self.setState({page: <HomePage />});
        });
        router.addRoute('add', function() {
            self.setState({page: <AddBitPage />});
        });
        router.addRoute('score', function() {
            self.setState({page: <ScoreBitPage />});
        });
        router.addRoute('about', function() {
            self.setState({page: <AboutPage />});
        });
        router.addRoute('privacy', function() {
            self.setState({page: <PrivacyPage />});
        });
        router.start();
    },
    render: function() {
        return this.state.page;
    }
});


// Start application and render components based on url & hashtag
// =============================================================================

React.render(<App/>, document.getElementById('content'));
