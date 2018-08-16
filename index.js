const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const Crawler = require('easycrawler')
const fs = require('fs')
const rimraf = require('rimraf')

// regex to check for a proper URL
// starts at 2 'cuz "node index" are 0 and 1, respectively
if(!process.argv[2].match(/(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+/g)) {
  console.error("Please use a correct URL.")
  process.exit(1)
}
const URL = process.argv[2]

let depth = 1
// 1 to 10
if(process.argv[3] && process.argv[3].match(/\b(10|[1-9])\b/g)) {
  depth = process.argv[3]
}

// 1 to 5
let threads = 5
if(process.argv[4] && process.argv[4].match(/[1-5]/g)) {
  threads = process.argv[4]
}

console.log(`Crawling ${URL}, at a depth of ${depth
}, with ${threads} threads.`)

const crawler = new Crawler({
    thread: threads, // how many threads at once (async)
    logs: false, // debug logging
    depth: depth, // crawl depth
    headers: {}, // headers to send
    // onlyCrawl: [], // only URLs containing these strings
    // reject: [], // no URLs with these strings
    onSuccess: crawlerSuccess,
    onError: crawlerError,
    onFinished: crawlerFinished
})

/**
  Deals with the URL request succeeding

  @param {object} data - the data of the returned document
*/
function crawlerSuccess(data) {
  // console.log(data.url) // successful URL
  // console.log(data.body) // successul URL HTML body
}

/**
  Deals with the URL request failing

  @param {object} data
*/
function crawlerError(data) {
  // console.log(data.url) // failed URL
  // console.log(data.status) // failed URL status code
}

/**
  Deals with the arrays of crawled and discovered links

  @param {object} urls - crawled and discovered URL arrays
*/
function crawlerFinished(urls) {
  if(
    urls.crawled.length === 0
    && urls.discovered.length === 0
    ) {
    console.error("\nPlease check your URL exists and has links in it.")
    return
  }
  // console.log("Crawled URLs:", urls.crawled)
  // console.log("Discovered URLs:", urls.discovered)
  saveLastCrawl({...urls, timeCreated: new Date()})
}

/**
  Saves crawled URLs

  @param {object} urls - the urls object
*/
function saveLastCrawl(urls) {
  save("lastCrawl.json", urls)
}

/**
  Clears the output folder
*/
function clearOutput() {
  console.log("Clearing output...")
  rimraf.sync("./output/*")
}

/**
  Saves a JSON object to the file system

  @param {string} filename - the name for the file, extension included
  @param {object} data - the object to stringify and save
  @param {function} callback - callback to execute on save
*/
function save(filename, data, callback) {
  // check for essentials
  if(!data || !filename) throw "No data or no filename"

  // check for callback and use default if no callback exists
  callback = callback ? callback : (err) => {
    if(err) throw err
    console.log(`Saved file ${filename}!`)
  }

  // check if data is object
  if(typeof data === "object") data = JSON.stringify(data, "", 2)

  // make sure it's a string we're saving
  if(typeof data === "string") {
    // check if output directory exists, create it if not
    if(!fs.existsSync("./output")) fs.mkdirSync("output")
    // write file to output
    fs.writeFile(`./output/${filename}`, data, callback)
  } else {
    console.error("Unable to save data.")
  }

}


/**
  Launches Chrome and Lighthouse and audits the provided url.

  @param {string} url - the url to audit
  @param {object} opts - the Lighthouse options
  @param {object} config - the Lighthouse and Chromelauncher config
*/
function launchChromeAndRunLighthouse(url, opts, config = null) {
  // run the chromelauncher
  return chromeLauncher.launch({chromeFlags: opts.chromeFlags}).then(chrome => {
    opts.port = chrome.port

    // run lighthouse
    return lighthouse(url, opts, config).then(results => {
      // saves the report to a nice HTML file
      save("audit.html", results.report)
      return chrome.kill().then(() => results.lhr)
    })
  })
}


/**
  Audit the given URL

  @param {string} url - the url to audit
*/
function audit(url) {
  const options = {
    chromeFlags: [
      '--show-paint-rects',
      '--headless'
    ],
    output: 'html'
  }

  launchChromeAndRunLighthouse(url, options).then(results => {
    // save the result data in a JSON file
    save("auditData.json", results)
  })
}

// clear output
clearOutput()

// crawl given URL
crawler.crawl(URL)

// audit given URL
audit(URL)
