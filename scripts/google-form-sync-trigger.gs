/**
 * ============================================================================
 * SWAR YOGA - REAL-TIME GOOGLE FORM TO CRM & NEW-REGISTRATION SYNC
 * ============================================================================
 * 
 * HOW TO INSTALL IN YOUR GOOGLE FORM IN 1 MINUTE:
 * 1. Open your Google Form in Google Drive.
 * 2. Click the 3 dots (⋮) in the top right corner -> Select "Script editor" (or Extensions -> Apps Script).
 * 3. Delete any code in the editor, and paste this entire file content.
 * 4. Click the Save icon (💾).
 * 5. Click the Clock icon (⏰ Triggers) on the left sidebar.
 * 6. Click "+ Add Trigger" in the bottom right corner:
 *    - Choose function to run: "onFormSubmit"
 *    - Choose which deployment: "Head"
 *    - Event source: "From form"
 *    - Event type: "On form submit"
 *    - Failure notification: "Notify me immediately"
 * 7. Click "Save", and grant Google permissions when prompted.
 * 
 * DONE! Every time a lead fills your Google Form from Meta Ads or anywhere,
 * their data will instantly appear in your Swar Yoga CRM under "My Data / New Registration"
 * and will automatically be routed to either Live Workshops or E-Learning!
 * ============================================================================
 */

// Your Swar Yoga Live CRM Webhook URL
var CRM_WEBHOOK_URL = "https://swaryoga.com/api/webhooks/google-forms";

function onFormSubmit(e) {
  try {
    var payload = {};
    
    // Method 1: Using Form Event Item Responses (Most accurate for Google Forms)
    if (e && e.response) {
      var itemResponses = e.response.getItemResponses();
      for (var i = 0; i < itemResponses.length; i++) {
        var item = itemResponses[i];
        var title = item.getItem().getTitle();
        var response = item.getResponse();
        
        // If response is an array (e.g. checkboxes), join with comma
        if (Array.isArray(response)) {
          payload[title] = response.join(", ");
        } else {
          payload[title] = response;
        }
      }
      
      // Capture submitter email if collected by Google Form settings
      if (e.response.getRespondentEmail) {
        var respondentEmail = e.response.getRespondentEmail();
        if (respondentEmail && !payload["Email"] && !payload["Email Address"]) {
          payload["Email"] = respondentEmail;
        }
      }
    } 
    // Method 2: Fallback using namedValues (when triggered from attached Google Sheet)
    else if (e && e.namedValues) {
      for (var key in e.namedValues) {
        var val = e.namedValues[key];
        payload[key] = Array.isArray(val) ? val.join(", ") : val;
      }
    } 
    // Method 3: Direct Active Form Inspection
    else {
      var form = FormApp.getActiveForm();
      if (form) {
        var responses = form.getResponses();
        if (responses.length > 0) {
          var latest = responses[responses.length - 1];
          var items = latest.getItemResponses();
          for (var j = 0; j < items.length; j++) {
            payload[items[j].getItem().getTitle()] = items[j].getResponse();
          }
        }
      }
    }

    // Add submission metadata
    payload["_submittedAt"] = new Date().toISOString();
    payload["_source"] = "google_forms_realtime";

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log("CRM Response Code: " + responseCode);
    Logger.log("CRM Response Body: " + responseBody);

  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  }
}

/**
 * Optional Test Function: Run this manually in the Apps Script editor
 * to verify connection to your live Swar Yoga CRM!
 */
function testConnectionToCRM() {
  var testPayload = {
    "Full Name": "Test Student (Meta/Google Form)",
    "WhatsApp Number": "919876543210",
    "Email": "teststudent@swaryoga.com",
    "Language": "Hindi",
    "Mode": "Live",
    "City": "Mumbai"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Output: " + response.getContentText());
}
