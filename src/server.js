require('dotenv').load();

const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VideoGrant = AccessToken.VideoGrant;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const defaultIdentity = 'alice';
// Use a valid Twilio number by adding to your account via https://www.twilio.com/console/phone-numbers/verified
const callerNumber = '1234567890';

/**
 * Creates an access token with VoiceGrant using your Twilio credentials.
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {string} - The Access Token string
 */
function tokenGenerator(request, response) {
  // Parse the identity from the http request
  var identity = null;
  var type = null;
  if (request.method == 'POST') {
    identity = request.body.identity;
    type = request.body.type;
  } else {
    identity = request.query.identity;
    type = request.query.type;
  }

  if(!identity) {
    identity = defaultIdentity;
  }

  // Used when generating any kind of tokens
  const accountSid = process.env.ACCOUNT_SID;
  const apiKey = process.env.API_KEY;
  const apiSecret = process.env.API_KEY_SECRET;

  // Used specifically for creating Voice tokens
  var pushCredSid = null;
  if(type == 'android') {
    pushCredSid = process.env.PUSH_CREDENTIAL_SID_ANDROID; // android FCM
  } else if(type == 'sandbox') {
    pushCredSid = process.env.PUSH_CREDENTIAL_SID_SANDBOX; // iOS APN sandbox
  } else {
    pushCredSid = process.env.PUSH_CREDENTIAL_SID_PRODCUT; // iOS APN product
  }
  
  const outgoingApplicationSid = process.env.APP_SID;

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: outgoingApplicationSid,
      pushCredentialSid: pushCredSid
    });

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const token = new AccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(voiceGrant);
  token.identity = identity;
  console.log('Token:' + token.toJwt());
  return response.send(token.toJwt());
}

/**
 * Creates an access token with VideoGrant using your Twilio credentials.
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {string} - The Access Token string
 */
function tokenVideoGenerator(request, response) {
  // Parse the identity from the http request
  var identity = null;
  if (request.method == 'POST') {
    identity = request.body.identity;
  } else {
    identity = request.query.identity;
  }

  if(!identity) {
    identity = defaultIdentity;
  }

  // Used when generating any kind of tokens
  const accountSid = process.env.ACCOUNT_SID;
  const apiKey = process.env.API_KEY;
  const apiSecret = process.env.API_KEY_SECRET;

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const videoGrant = new VideoGrant();

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const token = new AccessToken(accountSid, apiKey, apiSecret);
  token.addGrant(videoGrant);
  token.identity = identity;
  console.log('Token:' + token.toJwt());
  return response.send(token.toJwt());
}

/**
 * Creates an endpoint that can be used in your TwiML App as the Voice Request Url.
 * <br><br>
 * In order to make an outgoing call using Twilio Voice SDK, you need to provide a
 * TwiML App SID in the Access Token. You can run your server, make it publicly
 * accessible and use `/makeCall` endpoint as the Voice Request Url in your TwiML App.
 * <br><br>
 *
 * @param {Object} request - POST or GET request that provides the recipient of the call, a phone number or a client
 * @param {Object} response - The Response Object for the http request
 * @returns {Object} - The Response Object with TwiMl, used to respond to an outgoing call
 */
function makeCall(request, response) {
  // The recipient of the call, a phone number or a client
  var type = null;
  var to = null;
  var from = null;
  var name = null;
  var record = null;
  if (request.method == 'POST') {
    type = request.body.type;
    to = request.body.to;
    from = request.body.from;
    name = request.body.name;
    record = request.body.record;
  } else {
    type = request.query.type;
    to = request.query.to;
    from = request.query.from;
    name = request.query.name;
    record = request.query.record;
  }

  const voiceResponse = new VoiceResponse();

  if (type == 'conference') {
    const dial = voiceResponse.dial();
    if (record == 'true') {
      dial.conference({
        waitUrl: "",
        record: "record-from-start",
        recordingStatusCallback: "https://us-central1-flowly-app.cloudfunctions.net/recordingComplete"
      }, to);
    } else {
      dial.conference({
        waitUrl: ""
      }, to);    
    }
  } else {
    if (!to) {
      voiceResponse.say("Congratulations! You have made your first call! Good bye.");
    } else if (isNumber(to)) {
      const dial = voiceResponse.dial({callerId : callerNumber, answerOnBridge: true});
      dial.number(to);
    } else {
      const dial = voiceResponse.dial({callerId : from, answerOnBridge: true});
      const client = dial.client(to);
      client.parameter({
        name: "name",
        value: name
      });
    }
  }
  console.log('Response:' + voiceResponse.toString());
  return response.send(voiceResponse.toString());
}

/**
 * Creates an endpoint that plays back a greeting.
 */
function incoming() {
  const voiceResponse = new VoiceResponse();
  voiceResponse.say("Congratulations! You have received your first inbound call! Good bye.");
  console.log('Response:' + voiceResponse.toString());
  return voiceResponse.toString();
}

function welcome() {
  const voiceResponse = new VoiceResponse();
  voiceResponse.say("Welcome to Twilio");
  console.log('Response:' + voiceResponse.toString());
  return voiceResponse.toString();
}

function isNumber(to) {
  if(to.length == 1) {
    if(!isNaN(to)) {
      console.log("It is a 1 digit long number" + to);
      return true;
    }
  } else if(String(to).charAt(0) == '+') {
    number = to.substring(1);
    if(!isNaN(number)) {
      console.log("It is a number " + to);
      return true;
    };
  } else {
    if(!isNaN(to)) {
      console.log("It is a number " + to);
      return true;
    }
  }
  console.log("not a number");
  return false;
}

exports.tokenVideoGenerator = tokenVideoGenerator;
exports.tokenGenerator = tokenGenerator;
exports.makeCall = makeCall;
exports.incoming = incoming;
exports.welcome = welcome;
