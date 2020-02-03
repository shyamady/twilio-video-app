import twilio from "twilio";

const AccessToken = twilio.jwt.AccessToken;

// Substitute your Twilio AccountSid and ApiKey details
const ACCOUNT_SID = process.env.REACT_APP_TWILIO_ACCOUNT_SID;
const API_KEY_SID = process.env.REACT_APP_TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.REACT_APP_TWILIO_API_KEY_SECRET;

// Create an Access Token
const accessToken = new AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET);

export default accessToken;
