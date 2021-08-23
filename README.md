# Snowball Sampler

Search [Semantic Scholar Open Corpus](http://s2-public-api-prod.us-west-2.elasticbeanstalk.com/corpus/) with Snowball Sampling. Don't forget to run a local copy of the API [server](https://github.com/thiagoald/snowball-server) and expose it on http://localhost:5001.

## How to

### Build

```sh
$ apt install git
$ apt install npm
$ npm install
```

### Run

```sh
$ npm start
```

The server should be listening on http://localhost:3000.

### Use

To start, insert the hash from the end of a Semantic Scholar document URL. For example: https://www.semanticscholar.org/paper/Snowball-Sampling%3A-A-Purposeful-Method-of-Sampling-Naderifar-Goli/**6aec96da14bbc27c9707bc94a5c42fc96a952571**

![Enter](how_to_use.gif)